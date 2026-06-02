import { Injectable, Logger } from '@nestjs/common';
import { eq, and, gte } from 'drizzle-orm';
import { DrizzleService } from '../db/db.service';
import {
  syncEvents,
  workoutSessions,
  workoutExercises,
  workoutSets,
  exercises,
} from '../db/schema';
import { SyncPushDto, SyncEventDto } from './dto/sync.dto';

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(private drizzle: DrizzleService) {}

  async push(
    userId: string,
    dto: SyncPushDto,
  ): Promise<{ processed: number; errors: string[] }> {
    const errors: string[] = [];
    let processed = 0;

    // Sort by clientUpdatedAt ascending (apply in order)
    const sorted = [...dto.events].sort(
      (a, b) =>
        new Date(a.clientUpdatedAt).getTime() -
        new Date(b.clientUpdatedAt).getTime(),
    );

    for (const event of sorted) {
      try {
        await this.applyEvent(userId, event);
        processed++;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.warn(`Sync event ${event.id} failed: ${message}`);
        errors.push(`${event.id}: ${message}`);
      }
    }

    return { processed, errors };
  }

  async pull(userId: string, since?: string) {
    const db = this.drizzle.db;
    const conditions = [eq(syncEvents.userId, userId)];

    if (since) {
      conditions.push(gte(syncEvents.processedAt, new Date(since)));
    }

    const events = await db
      .select()
      .from(syncEvents)
      .where(and(...conditions))
      .orderBy(syncEvents.processedAt);

    return { events, syncedAt: new Date().toISOString() };
  }

  private async applyEvent(userId: string, event: SyncEventDto) {
    const db = this.drizzle.db;

    // Store the sync event record
    await db.insert(syncEvents).values({
      id: event.id,
      userId,
      entityType: event.entityType as any,
      entityId: event.entityId,
      action: event.action as any,
      payload: event.payload ?? null,
      clientUpdatedAt: new Date(event.clientUpdatedAt),
    });

    // Apply to actual tables
    switch (event.entityType) {
      case 'workout':
        await this.applyWorkoutEvent(userId, event);
        break;
      case 'workout_exercise':
        await this.applyWorkoutExerciseEvent(event);
        break;
      case 'workout_set':
        await this.applyWorkoutSetEvent(event);
        break;
      case 'exercise':
        await this.applyExerciseEvent(userId, event);
        break;
      default:
        this.logger.debug(`Unhandled entity type: ${event.entityType}`);
    }
  }

  private async applyWorkoutEvent(userId: string, event: SyncEventDto) {
    const db = this.drizzle.db;
    const p = event.payload as any;

    switch (event.action) {
      case 'create':
        await db
          .insert(workoutSessions)
          .values({
            id: event.entityId,
            userId,
            title: p?.title,
            startedAt: p?.startedAt ? new Date(p.startedAt) : null,
            finishedAt: p?.finishedAt ? new Date(p.finishedAt) : null,
            notes: p?.notes,
          })
          .onConflictDoNothing();
        break;

      case 'update': {
        // last-write-wins: check client_updated_at vs existing
        const [existing] = await db
          .select({ updatedAt: workoutSessions.updatedAt })
          .from(workoutSessions)
          .where(eq(workoutSessions.id, event.entityId))
          .limit(1);

        const clientTime = new Date(event.clientUpdatedAt);
        if (!existing || existing.updatedAt <= clientTime) {
          await db
            .update(workoutSessions)
            .set({
              title: p?.title,
              finishedAt: p?.finishedAt ? new Date(p.finishedAt) : undefined,
              notes: p?.notes,
              updatedAt: clientTime,
            })
            .where(eq(workoutSessions.id, event.entityId));
        }
        break;
      }

      case 'delete':
        await db
          .delete(workoutSessions)
          .where(
            and(
              eq(workoutSessions.id, event.entityId),
              eq(workoutSessions.userId, userId),
            ),
          );
        break;
    }
  }

  private async applyWorkoutExerciseEvent(event: SyncEventDto) {
    const db = this.drizzle.db;
    const p = event.payload as any;

    switch (event.action) {
      case 'create':
        await db
          .insert(workoutExercises)
          .values({
            id: event.entityId,
            sessionId: p?.sessionId,
            exerciseId: p?.exerciseId,
            orderIndex: p?.orderIndex ?? 0,
            notes: p?.notes,
          })
          .onConflictDoNothing();
        break;

      case 'update':
        await db
          .update(workoutExercises)
          .set({ orderIndex: p?.orderIndex, notes: p?.notes })
          .where(eq(workoutExercises.id, event.entityId));
        break;

      case 'delete':
        await db
          .delete(workoutExercises)
          .where(eq(workoutExercises.id, event.entityId));
        break;
    }
  }

  private async applyWorkoutSetEvent(event: SyncEventDto) {
    const db = this.drizzle.db;
    const p = event.payload as any;

    switch (event.action) {
      case 'create':
        await db
          .insert(workoutSets)
          .values({
            id: event.entityId,
            workoutExerciseId: p?.workoutExerciseId,
            weightKg: p?.weightKg,
            reps: p?.reps,
            completed: p?.completed ?? false,
            restTimerSec: p?.restTimerSec,
          })
          .onConflictDoNothing();
        break;

      case 'update':
        await db
          .update(workoutSets)
          .set({
            weightKg: p?.weightKg,
            reps: p?.reps,
            completed: p?.completed,
            restTimerSec: p?.restTimerSec,
          })
          .where(eq(workoutSets.id, event.entityId));
        break;

      case 'delete':
        await db
          .delete(workoutSets)
          .where(eq(workoutSets.id, event.entityId));
        break;
    }
  }

  private async applyExerciseEvent(userId: string, event: SyncEventDto) {
    const db = this.drizzle.db;
    const p = event.payload as any;

    switch (event.action) {
      case 'create':
        await db
          .insert(exercises)
          .values({
            id: event.entityId,
            name: p?.name,
            muscleGroups: p?.muscleGroups ?? [],
            equipment: p?.equipment,
            difficulty: p?.difficulty,
            description: p?.description,
            isCustom: true,
            userId,
          })
          .onConflictDoNothing();
        break;

      case 'update':
        await db
          .update(exercises)
          .set({
            name: p?.name,
            muscleGroups: p?.muscleGroups,
            equipment: p?.equipment,
            difficulty: p?.difficulty,
          })
          .where(and(eq(exercises.id, event.entityId), eq(exercises.userId, userId)));
        break;

      case 'delete':
        await db
          .delete(exercises)
          .where(and(eq(exercises.id, event.entityId), eq(exercises.userId, userId)));
        break;
    }
  }
}
