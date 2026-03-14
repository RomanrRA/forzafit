import {
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import * as bcrypt from 'bcrypt';
import { eq, and } from 'drizzle-orm';
import { DrizzleService } from '../db/db.service';
import { users, refreshTokens } from '../db/schema';
import { AuthResponseDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private drizzle: DrizzleService,
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  async loginWithFirebase(idToken: string): Promise<AuthResponseDto> {
    let decoded: admin.auth.DecodedIdToken;
    try {
      decoded = await admin.auth().verifyIdToken(idToken);
    } catch (err) {
      this.logger.warn(`Firebase token verification failed: ${err.message}`);
      throw new UnauthorizedException('Недействительный Firebase токен');
    }

    const db = this.drizzle.db;

    // Find or create user
    let [user] = await db
      .select()
      .from(users)
      .where(eq(users.firebaseUid, decoded.uid))
      .limit(1);

    if (!user) {
      [user] = await db
        .insert(users)
        .values({
          firebaseUid: decoded.uid,
          email: decoded.email ?? '',
          name: decoded.name ?? null,
        })
        .returning();
    }

    return this.issueTokens(user.id, user.email, user.subscriptionTier);
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
    const tokenHash = await bcrypt.hash(refreshToken, 1);

    // Find valid token
    const [storedToken] = await db
      .select()
      .from(refreshTokens)
      .where(
        and(
          eq(refreshTokens.userId, payload.sub),
          eq(refreshTokens.revoked, false),
        ),
      )
      .limit(20);

    if (!storedToken) {
      throw new UnauthorizedException('Refresh token не найден или отозван');
    }

    // Verify hash
    const valid = await bcrypt.compare(refreshToken, storedToken.tokenHash);
    if (!valid) {
      throw new UnauthorizedException('Refresh token не совпадает');
    }

    if (storedToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token истёк');
    }

    // Revoke old token
    await db
      .update(refreshTokens)
      .set({ revoked: true })
      .where(eq(refreshTokens.id, storedToken.id));

    // Get user
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

    const tokens = await db
      .select()
      .from(refreshTokens)
      .where(
        and(eq(refreshTokens.userId, userId), eq(refreshTokens.revoked, false)),
      );

    // Revoke matching token
    for (const t of tokens) {
      const match = await bcrypt.compare(refreshToken, t.tokenHash);
      if (match) {
        await db
          .update(refreshTokens)
          .set({ revoked: true })
          .where(eq(refreshTokens.id, t.id));
        return;
      }
    }
  }

  private async issueTokens(
    userId: string,
    email: string,
    subscriptionTier: string,
  ): Promise<AuthResponseDto> {
    const accessToken = await this.jwtService.signAsync(
      { sub: userId, email, subscriptionTier },
      { expiresIn: '15m' },
    );

    const rawRefresh = await this.jwtService.signAsync(
      { sub: userId, type: 'refresh' },
      {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: '30d',
      },
    );

    const tokenHash = await bcrypt.hash(rawRefresh, 10);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await this.drizzle.db.insert(refreshTokens).values({
      userId,
      tokenHash,
      expiresAt,
    });

    return {
      accessToken,
      refreshToken: rawRefresh,
      expiresIn: 15 * 60,
    };
  }
}
