import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { eq, and, or, sql, desc, inArray } from 'drizzle-orm';
import { DrizzleService } from '../db/db.service';
import { friendships, users } from '../db/schema';

export type FriendshipStatus = 'pending' | 'accepted' | 'blocked';

@Injectable()
export class FriendsService {
  constructor(private drizzle: DrizzleService) {}

  /** Создать запрос дружбы по username. */
  async createRequest(userId: string, targetUsername: string) {
    const db = this.drizzle.db;
    const normalized = targetUsername.trim().toLowerCase();

    const [target] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.username, normalized))
      .limit(1);

    if (!target) throw new NotFoundException('Пользователь не найден');
    if (target.id === userId) {
      throw new BadRequestException('Нельзя добавить самого себя');
    }

    // Уже есть пара в любую сторону?
    const [existing] = await db
      .select()
      .from(friendships)
      .where(
        or(
          and(
            eq(friendships.requesterId, userId),
            eq(friendships.addresseeId, target.id),
          ),
          and(
            eq(friendships.requesterId, target.id),
            eq(friendships.addresseeId, userId),
          ),
        ),
      )
      .limit(1);

    if (existing) {
      if (existing.status === 'accepted') {
        throw new ConflictException('Уже друзья');
      }
      if (existing.status === 'blocked') {
        throw new ForbiddenException('Нельзя отправить запрос');
      }
      throw new ConflictException('Запрос уже отправлен');
    }

    const [created] = await db
      .insert(friendships)
      .values({
        requesterId: userId,
        addresseeId: target.id,
        status: 'pending',
      })
      .returning();

    return created;
  }

  /** Принять входящий запрос. */
  async acceptRequest(userId: string, friendshipId: string) {
    const db = this.drizzle.db;

    const [row] = await db
      .select()
      .from(friendships)
      .where(eq(friendships.id, friendshipId))
      .limit(1);

    if (!row) throw new NotFoundException('Запрос не найден');
    if (row.addresseeId !== userId) {
      throw new ForbiddenException('Только адресат может принять запрос');
    }
    if (row.status !== 'pending') {
      throw new BadRequestException('Запрос уже не в статусе pending');
    }

    const [updated] = await db
      .update(friendships)
      .set({ status: 'accepted', updatedAt: new Date() })
      .where(eq(friendships.id, friendshipId))
      .returning();

    return updated;
  }

  /** Удалить запрос (отклонить если адресат, отменить если requester) или удалить accepted (unfriend). */
  async deleteFriendship(userId: string, friendshipId: string) {
    const db = this.drizzle.db;

    const [row] = await db
      .select()
      .from(friendships)
      .where(eq(friendships.id, friendshipId))
      .limit(1);

    if (!row) throw new NotFoundException('Связь не найдена');
    if (row.requesterId !== userId && row.addresseeId !== userId) {
      throw new ForbiddenException('Нет доступа');
    }

    await db.delete(friendships).where(eq(friendships.id, friendshipId));
  }

  /** Список связей юзера с указанным статусом. */
  async listFriends(userId: string, status: FriendshipStatus = 'accepted') {
    const db = this.drizzle.db;

    const rows = await db
      .select({
        id: friendships.id,
        requesterId: friendships.requesterId,
        addresseeId: friendships.addresseeId,
        status: friendships.status,
        createdAt: friendships.createdAt,
        updatedAt: friendships.updatedAt,
        // друг — это другая сторона пары
        friendId: sql<string>`
          CASE WHEN ${friendships.requesterId} = ${userId}
               THEN ${friendships.addresseeId}
               ELSE ${friendships.requesterId}
          END
        `.as('friend_id'),
      })
      .from(friendships)
      .where(
        and(
          or(
            eq(friendships.requesterId, userId),
            eq(friendships.addresseeId, userId),
          ),
          eq(friendships.status, status),
        ),
      )
      .orderBy(desc(friendships.updatedAt));

    if (rows.length === 0) return [];

    const friendIds = rows.map((r) => r.friendId);
    const friendsData = await db
      .select({
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        name: users.name,
        avatarUrl: users.avatarUrl,
        isProfilePublic: users.isProfilePublic,
      })
      .from(users)
      .where(inArray(users.id, friendIds));

    const friendMap = new Map(friendsData.map((u) => [u.id, u]));

    return rows.map((r) => ({
      friendshipId: r.id,
      status: r.status,
      direction:
        r.requesterId === userId
          ? ('outgoing' as const)
          : ('incoming' as const),
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      friend: friendMap.get(r.friendId) ?? null,
    }));
  }

  /** Заблокировать пользователя по username. */
  async block(userId: string, targetUsername: string) {
    const db = this.drizzle.db;
    const normalized = targetUsername.trim().toLowerCase();

    const [target] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.username, normalized))
      .limit(1);

    if (!target) throw new NotFoundException('Пользователь не найден');
    if (target.id === userId) {
      throw new BadRequestException('Нельзя заблокировать самого себя');
    }

    const [existing] = await db
      .select()
      .from(friendships)
      .where(
        or(
          and(
            eq(friendships.requesterId, userId),
            eq(friendships.addresseeId, target.id),
          ),
          and(
            eq(friendships.requesterId, target.id),
            eq(friendships.addresseeId, userId),
          ),
        ),
      )
      .limit(1);

    if (existing) {
      const [updated] = await db
        .update(friendships)
        .set({
          status: 'blocked',
          requesterId: userId,
          addresseeId: target.id,
          updatedAt: new Date(),
        })
        .where(eq(friendships.id, existing.id))
        .returning();
      return updated;
    }

    const [created] = await db
      .insert(friendships)
      .values({
        requesterId: userId,
        addresseeId: target.id,
        status: 'blocked',
      })
      .returning();
    return created;
  }

  /** Получить ID всех принятых друзей (используется feed/leaderboard). */
  async getAcceptedFriendIds(userId: string): Promise<string[]> {
    const db = this.drizzle.db;
    const rows = await db
      .select({
        requesterId: friendships.requesterId,
        addresseeId: friendships.addresseeId,
      })
      .from(friendships)
      .where(
        and(
          or(
            eq(friendships.requesterId, userId),
            eq(friendships.addresseeId, userId),
          ),
          eq(friendships.status, 'accepted'),
        ),
      );

    return rows.map((r) =>
      r.requesterId === userId ? r.addresseeId : r.requesterId,
    );
  }
}
