import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { eq, and, isNull, gt } from 'drizzle-orm';
import { DrizzleService } from '../db/db.service';
import { users, refreshTokens, passwordResets } from '../db/schema';
import { AuthResponseDto } from './dto/login.dto';
import { MailService } from '../mail/mail.service';
import { UsersService } from '../users/users.service';

const BCRYPT_COST = 12;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 час

function hashRefreshToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// Используется в validateUser, чтобы уравнять задержку bcrypt.compare
// между существующим и несуществующим email (защита от timing-oracle
// email-enumeration). Вычисляется один раз при первом обращении.
let _dummyPasswordHash: string | null = null;
async function getDummyPasswordHash(): Promise<string> {
  if (!_dummyPasswordHash) {
    _dummyPasswordHash = await bcrypt.hash(
      crypto.randomBytes(32).toString('hex'),
      BCRYPT_COST,
    );
  }
  return _dummyPasswordHash;
}

export interface AuthenticatedUser {
  userId: string;
  email: string;
  subscriptionTier: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private drizzle: DrizzleService,
    private jwtService: JwtService,
    private config: ConfigService,
    private mail: MailService,
    private usersService: UsersService,
  ) {}

  async register(
    email: string,
    password: string,
    name?: string,
  ): Promise<AuthResponseDto> {
    const db = this.drizzle.db;
    const normalized = email.trim().toLowerCase();

    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, normalized))
      .limit(1);

    if (existing) {
      throw new ConflictException('Пользователь с таким email уже существует');
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
    const username = await this.usersService.generateUniqueUsername(normalized);

    const [user] = await db
      .insert(users)
      .values({
        email: normalized,
        passwordHash,
        name: name ?? null,
        username,
        displayName: name ?? null,
      })
      .returning();

    return this.issueTokens(user.id, user.email, user.subscriptionTier);
  }

  async validateUser(
    email: string,
    password: string,
  ): Promise<AuthenticatedUser | null> {
    const db = this.drizzle.db;
    const normalized = email.trim().toLowerCase();

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, normalized))
      .limit(1);

    const passwordHash = user?.passwordHash ?? (await getDummyPasswordHash());
    const ok = await bcrypt.compare(password, passwordHash);
    if (!user || !ok) return null;

    return {
      userId: user.id,
      email: user.email,
      subscriptionTier: user.subscriptionTier,
    };
  }

  async login(user: AuthenticatedUser): Promise<AuthResponseDto> {
    return this.issueTokens(user.userId, user.email, user.subscriptionTier);
  }

  async refresh(refreshToken: string): Promise<AuthResponseDto> {
    let payload: { sub: string; type: string };
    try {
      payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Недействительный refresh token');
    }

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Неверный тип токена');
    }

    const db = this.drizzle.db;

    const tokenHash = hashRefreshToken(refreshToken);

    const [matched] = await db
      .select()
      .from(refreshTokens)
      .where(
        and(
          eq(refreshTokens.userId, payload.sub),
          eq(refreshTokens.tokenHash, tokenHash),
        ),
      )
      .limit(1);

    if (!matched) {
      throw new UnauthorizedException('Refresh token не найден');
    }

    if (matched.revoked) {
      await db
        .update(refreshTokens)
        .set({ revoked: true })
        .where(
          and(
            eq(refreshTokens.userId, payload.sub),
            eq(refreshTokens.revoked, false),
          ),
        );
      this.logger.warn(
        `Refresh token reuse detected for user ${payload.sub}. All tokens revoked.`,
      );
      throw new UnauthorizedException('Refresh token уже использован');
    }

    if (matched.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token истёк');
    }

    await db
      .update(refreshTokens)
      .set({ revoked: true })
      .where(eq(refreshTokens.id, matched.id));

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, payload.sub))
      .limit(1);

    if (!user) throw new UnauthorizedException('Пользователь не найден');

    return this.issueTokens(user.id, user.email, user.subscriptionTier);
  }

  async logout(userId: string, refreshToken: string): Promise<void> {
    const db = this.drizzle.db;
    const tokenHash = hashRefreshToken(refreshToken);

    await db
      .update(refreshTokens)
      .set({ revoked: true })
      .where(
        and(
          eq(refreshTokens.userId, userId),
          eq(refreshTokens.tokenHash, tokenHash),
          eq(refreshTokens.revoked, false),
        ),
      );
  }

  async requestPasswordReset(email: string): Promise<void> {
    const db = this.drizzle.db;
    const normalized = email.trim().toLowerCase();

    const [user] = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(eq(users.email, normalized))
      .limit(1);

    if (!user) {
      this.logger.log(
        `Password reset requested for non-existent email: ${normalized}`,
      );
      return;
    }

    // Инвалидируем все активные reset-токены этого пользователя,
    // чтобы старые ссылки из предыдущих писем не оставались валидными.
    await db
      .update(passwordResets)
      .set({ usedAt: new Date() })
      .where(
        and(
          eq(passwordResets.userId, user.id),
          isNull(passwordResets.usedAt),
        ),
      );

    const rawToken = crypto.randomBytes(32).toString('base64url');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

    await db.insert(passwordResets).values({
      userId: user.id,
      tokenHash,
      expiresAt,
    });

    const appUrl = this.config.get<string>('APP_URL') ?? 'http://localhost:3000';
    const resetUrl = `${appUrl.replace(/\/+$/, '')}/reset-password?token=${rawToken}`;

    // Fire-and-forget: не await, чтобы время ответа не зависело от SMTP
    // (закрывает timing-oracle email-enumeration на /auth/forgot-password).
    void this.mail.sendPasswordReset(user.email, resetUrl).catch((err) =>
      this.logger.error(
        `sendPasswordReset failed: ${(err as Error).message}`,
      ),
    );
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const db = this.drizzle.db;

    const [user] = await db
      .select({ id: users.id, passwordHash: users.passwordHash })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) throw new UnauthorizedException('Пользователь не найден');

    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Неверный текущий пароль');

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_COST);

    await db
      .update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.id, userId));

    // Ревоковать все активные refresh-токены — пусть переавторизуется на других устройствах
    await db
      .update(refreshTokens)
      .set({ revoked: true })
      .where(
        and(
          eq(refreshTokens.userId, userId),
          eq(refreshTokens.revoked, false),
        ),
      );
  }

  async resetPassword(rawToken: string, newPassword: string): Promise<void> {
    const db = this.drizzle.db;
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    // Атомарный consume: UPDATE с условием used_at IS NULL + срок годности.
    // Только один параллельный запрос сможет пометить токен использованным,
    // остальные вернут 0 строк и получат 400 — TOCTOU закрыт.
    const [consumed] = await db
      .update(passwordResets)
      .set({ usedAt: new Date() })
      .where(
        and(
          eq(passwordResets.tokenHash, tokenHash),
          isNull(passwordResets.usedAt),
          gt(passwordResets.expiresAt, new Date()),
        ),
      )
      .returning({ id: passwordResets.id, userId: passwordResets.userId });

    if (!consumed) {
      throw new BadRequestException(
        'Недействительный, использованный или просроченный токен',
      );
    }

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_COST);

    await db
      .update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.id, consumed.userId));

    // Ревоковать все активные refresh-токены пользователя
    await db
      .update(refreshTokens)
      .set({ revoked: true })
      .where(
        and(
          eq(refreshTokens.userId, consumed.userId),
          eq(refreshTokens.revoked, false),
        ),
      );
  }

  private async issueTokens(
    userId: string,
    email: string,
    subscriptionTier: string,
  ): Promise<AuthResponseDto> {
    const accessToken = await this.jwtService.signAsync(
      { sub: userId, email, subscriptionTier },
      { expiresIn: '2h' },
    );

    const rawRefresh = await this.jwtService.signAsync(
      { sub: userId, type: 'refresh', jti: crypto.randomUUID() },
      {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: '30d',
      },
    );

    const tokenHash = hashRefreshToken(rawRefresh);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await this.drizzle.db.insert(refreshTokens).values({
      userId,
      tokenHash,
      expiresAt,
    });

    return {
      accessToken,
      refreshToken: rawRefresh,
      expiresIn: 2 * 60 * 60,
    };
  }
}
