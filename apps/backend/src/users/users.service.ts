import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  OnModuleInit,
} from '@nestjs/common';
import { eq, isNull } from 'drizzle-orm';
import { DrizzleService } from '../db/db.service';
import { users } from '../db/schema';
import { UpdateUserDto } from './dto/update-user.dto';

const PUBLIC_USER_COLUMNS = {
  id: users.id,
  email: users.email,
  name: users.name,
  gender: users.gender,
  dob: users.dob,
  heightCm: users.heightCm,
  weightKg: users.weightKg,
  goal: users.goal,
  appMode: users.appMode,
  subscriptionTier: users.subscriptionTier,
  username: users.username,
  displayName: users.displayName,
  avatarUrl: users.avatarUrl,
  bio: users.bio,
  isProfilePublic: users.isProfilePublic,
  createdAt: users.createdAt,
  updatedAt: users.updatedAt,
} as const;

const PROFILE_PUBLIC_COLUMNS = {
  id: users.id,
  username: users.username,
  displayName: users.displayName,
  name: users.name,
  avatarUrl: users.avatarUrl,
  bio: users.bio,
  isProfilePublic: users.isProfilePublic,
  createdAt: users.createdAt,
} as const;

@Injectable()
export class UsersService implements OnModuleInit {
  private readonly logger = new Logger(UsersService.name);

  constructor(private drizzle: DrizzleService) {}

  async onModuleInit() {
    // Backfill username для существующих юзеров (после миграции 0008).
    // У старых аккаунтов username == null — генерим из email.
    const db = this.drizzle.db;
    const noUsername = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(isNull(users.username));

    if (noUsername.length === 0) return;
    this.logger.log(`Backfill username для ${noUsername.length} юзеров...`);
    for (const u of noUsername) {
      const username = await this.generateUniqueUsername(u.email);
      await db.update(users).set({ username }).where(eq(users.id, u.id));
    }
    this.logger.log('Backfill username завершён');
  }

  async findById(id: string) {
    const [user] = await this.drizzle.db
      .select(PUBLIC_USER_COLUMNS)
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!user) throw new NotFoundException('Пользователь не найден');
    return user;
  }

  async findByUsername(username: string, requesterId: string) {
    const normalized = username.trim().toLowerCase();
    const [user] = await this.drizzle.db
      .select(PROFILE_PUBLIC_COLUMNS)
      .from(users)
      .where(eq(users.username, normalized))
      .limit(1);

    if (!user) throw new NotFoundException('Пользователь не найден');
    if (!user.isProfilePublic && user.id !== requesterId) {
      throw new ForbiddenException('Профиль скрыт');
    }
    return user;
  }

  async update(id: string, dto: UpdateUserDto) {
    const db = this.drizzle.db;

    // Если меняется username — проверим занятость другим юзером
    if (dto.username !== undefined) {
      const candidate = dto.username.trim().toLowerCase();
      const [existing] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.username, candidate))
        .limit(1);
      if (existing && existing.id !== id) {
        throw new ConflictException('username уже занят');
      }
    }

    const [user] = await db
      .update(users)
      .set({
        ...(dto.name !== undefined            && { name: dto.name }),
        ...(dto.gender !== undefined          && { gender: dto.gender }),
        ...(dto.dob !== undefined             && { dob: new Date(dto.dob) }),
        ...(dto.heightCm !== undefined        && { heightCm: dto.heightCm }),
        ...(dto.weightKg !== undefined        && { weightKg: dto.weightKg }),
        ...(dto.goal !== undefined            && { goal: dto.goal }),
        ...(dto.appMode !== undefined         && { appMode: dto.appMode }),
        ...(dto.username !== undefined        && { username: dto.username.trim().toLowerCase() }),
        ...(dto.displayName !== undefined     && { displayName: dto.displayName }),
        ...(dto.bio !== undefined             && { bio: dto.bio }),
        ...(dto.avatarUrl !== undefined       && { avatarUrl: dto.avatarUrl }),
        ...(dto.isProfilePublic !== undefined && { isProfilePublic: dto.isProfilePublic }),
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning(PUBLIC_USER_COLUMNS);

    if (!user) throw new NotFoundException('Пользователь не найден');
    return user;
  }

  async deleteAccount(id: string): Promise<void> {
    await this.drizzle.db.delete(users).where(eq(users.id, id));
  }

  /**
   * Сгенерировать уникальный username из email.
   * Берёт localpart, нормализует к [a-z0-9_], добавляет суффикс _N если занят.
   */
  async generateUniqueUsername(email: string): Promise<string> {
    const local = email.split('@')[0] ?? 'user';
    let base = local
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 20);
    if (!base || !/^[a-z]/.test(base)) base = 'user' + base.replace(/^_+/, '');
    if (base.length < 3) base = base + 'er';

    const db = this.drizzle.db;
    let candidate = base;
    let i = 2;
    while (true) {
      const [existing] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.username, candidate))
        .limit(1);
      if (!existing) return candidate;
      candidate = `${base}_${i++}`;
      if (i > 9999) {
        // запасной вариант — рандомный suffix
        candidate = `${base}_${Math.random().toString(36).slice(2, 8)}`;
        const [exists2] = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.username, candidate))
          .limit(1);
        if (!exists2) return candidate;
        throw new Error('Не удалось сгенерировать username');
      }
    }
  }
}

