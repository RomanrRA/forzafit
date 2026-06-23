import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, count, desc, eq, gte, inArray } from 'drizzle-orm';
import { DrizzleService } from '../db/db.service';
import { FriendsService } from '../friends/friends.service';
import {
  bodyMeasurements,
  exercises,
  personalRecords,
  prHistory,
  streaks,
  users,
  workoutExercises,
  workoutSessions,
  workoutSets,
} from '../db/schema';

// ─── Типы ───────────────────────────────────────────────────────────────────

export type StatKey =
  | 'strength'
  | 'power'
  | 'endurance'
  | 'intensity'
  | 'discipline'
  | 'balance';

export interface StatProfile {
  userId: string;
  level: number;
  /** Средний по 6 статам, 0–100 */
  overall: number;
  /** Каждый стат нормирован в 0–100 */
  stats: Record<StatKey, number>;
}

/** Сырые агрегаты из БД — вход для чистой функции нормализации (тестируемо). */
export interface RawStatInputs {
  bodyweightKg: number | null;
  /** Топ-3 one_rm PR (по упражнениям), кг, по убыванию */
  topOneRmKg: number[];
  /** Кол-во новых PR за окно «мощи» */
  recentPrCount: number;
  /** Суммарные завершённые повторы по каждой недавней сессии */
  sessionReps: number[];
  /** Отношения рабочий_вес / one_rm по сетам (где есть PR) */
  intensityRatios: number[];
  currentStreak: number;
  /** Завершённых сессий за 28 дней */
  sessions28: number;
  /** Кол-во сетов по крупным группам мышц */
  muscleBucketCounts: Record<string, number>;
}

// ─── Тюнинг-константы нормализации ───────────────────────────────────────────

const DEFAULT_BODYWEIGHT_KG = 75;
/** avg(topOneRm) / bodyweight, дающий 100 баллов СИЛЫ */
const STRENGTH_RATIO_FULL = 2.0;
const POWER_WINDOW_DAYS = 90;
/** PR за окно, дающих 100 баллов МОЩИ */
const POWER_PR_FULL = 12;
/** Окно (дней) для сетов/сессий: выносливость, интенсивность, баланс */
const RECENT_WINDOW_DAYS = 56;
/** Средние завершённые повторы за сессию, дающие 100 баллов ВЫНОСЛИВОСТИ */
const ENDURANCE_REPS_FULL = 180;
const DISCIPLINE_STREAK_FULL = 30;
const DISCIPLINE_SESSIONS28_FULL = 16;
/** Капаем хранимое отношение веса к PR, чтобы выбросы не ломали среднее */
const INTENSITY_STORE_CAP = 1.5;
/** overall / LEVEL_DIVISOR → прибавка к уровню */
const LEVEL_DIVISOR = 6;

const MAJOR_MUSCLE_BUCKETS = [
  'chest',
  'back',
  'legs',
  'shoulders',
  'arms',
  'core',
] as const;

/** primaryMuscles из free-exercise-db → крупная группа */
const MUSCLE_TO_BUCKET: Record<string, string> = {
  chest: 'chest',
  lats: 'back',
  'middle back': 'back',
  'lower back': 'back',
  traps: 'back',
  neck: 'back',
  quadriceps: 'legs',
  hamstrings: 'legs',
  calves: 'legs',
  glutes: 'legs',
  adductors: 'legs',
  abductors: 'legs',
  shoulders: 'shoulders',
  biceps: 'arms',
  triceps: 'arms',
  forearms: 'arms',
  abdominals: 'core',
};

// ─── Чистые хелперы (экспортируются для юнит-тестов) ──────────────────────────

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));
const avg = (xs: number[]) =>
  xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;

/** Первая распознанная крупная группа для упражнения, либо null */
export function bucketOf(primaryMuscles: string[] | null | undefined): string | null {
  if (!primaryMuscles) return null;
  for (const m of primaryMuscles) {
    const b = MUSCLE_TO_BUCKET[m.toLowerCase()];
    if (b) return b;
  }
  return null;
}

/** Нормированная энтропия Шеннона распределения, 0..1 (равномерность) */
export function normalizedEntropy(counts: number[]): number {
  const total = counts.reduce((a, b) => a + b, 0);
  if (total <= 0) return 0;
  let h = 0;
  for (const c of counts) {
    if (c <= 0) continue;
    const p = c / total;
    h -= p * Math.log(p);
  }
  return h / Math.log(counts.length);
}

export function normalizeStats(raw: RawStatInputs): {
  stats: Record<StatKey, number>;
  overall: number;
  level: number;
} {
  const bw = raw.bodyweightKg ?? DEFAULT_BODYWEIGHT_KG;

  // СИЛА — относительная сила: средний топ-1ПМ к массе тела
  const strength = clamp((avg(raw.topOneRmKg) / bw / STRENGTH_RATIO_FULL) * 100);

  // МОЩЬ — темп новых PR
  const power = clamp((raw.recentPrCount / POWER_PR_FULL) * 100);

  // ВЫНОСЛИВОСТЬ — средний объём повторов за сессию
  const endurance = clamp((avg(raw.sessionReps) / ENDURANCE_REPS_FULL) * 100);

  // ИНТЕНСИВНОСТЬ — средний рабочий вес как доля от PR
  const intensity = clamp(
    avg(raw.intensityRatios.map((r) => Math.min(r, 1))) * 100,
  );

  // ДИСЦИПЛИНА — стрик + регулярность
  const streakScore = clamp((raw.currentStreak / DISCIPLINE_STREAK_FULL) * 100);
  const freqScore = clamp((raw.sessions28 / DISCIPLINE_SESSIONS28_FULL) * 100);
  const discipline = (streakScore + freqScore) / 2;

  // БАЛАНС — равномерность прокачки крупных групп
  const counts = MAJOR_MUSCLE_BUCKETS.map((b) => raw.muscleBucketCounts[b] ?? 0);
  const balance = normalizedEntropy(counts) * 100;

  const stats: Record<StatKey, number> = {
    strength: Math.round(strength),
    power: Math.round(power),
    endurance: Math.round(endurance),
    intensity: Math.round(intensity),
    discipline: Math.round(discipline),
    balance: Math.round(balance),
  };
  const overall = Math.round(
    (Object.values(stats) as number[]).reduce((a, b) => a + b, 0) / 6,
  );
  const level = 1 + Math.floor(overall / LEVEL_DIVISOR);
  return { stats, overall, level };
}

// ─── Сервис ───────────────────────────────────────────────────────────────────

@Injectable()
export class StatsService {
  constructor(
    private drizzle: DrizzleService,
    private friends: FriendsService,
  ) {}

  getMyStats(userId: string): Promise<StatProfile> {
    return this.getStatsForUser(userId, userId);
  }

  async getStatsForUser(
    viewerId: string,
    targetUserId: string,
  ): Promise<StatProfile> {
    const db = this.drizzle.db;

    if (viewerId !== targetUserId) {
      const [target] = await db
        .select({ pub: users.isProfilePublic })
        .from(users)
        .where(eq(users.id, targetUserId))
        .limit(1);
      if (!target) throw new NotFoundException('Пользователь не найден');
      if (!target.pub) {
        const friendIds = await this.friends.getAcceptedFriendIds(viewerId);
        if (!friendIds.includes(targetUserId))
          throw new ForbiddenException('Профиль закрыт');
      }
    }

    const raw = await this.loadRaw(targetUserId);
    const { stats, overall, level } = normalizeStats(raw);
    return { userId: targetUserId, level, overall, stats };
  }

  private async loadRaw(userId: string): Promise<RawStatInputs> {
    const db = this.drizzle.db;
    const now = Date.now();
    const day = 86_400_000;
    const since90 = new Date(now - POWER_WINDOW_DAYS * day);
    const sinceRecent = new Date(now - RECENT_WINDOW_DAYS * day);
    const since28 = new Date(now - 28 * day);

    // Масса тела: последний замер, иначе профиль
    const [bm] = await db
      .select({ w: bodyMeasurements.weightKg })
      .from(bodyMeasurements)
      .where(eq(bodyMeasurements.userId, userId))
      .orderBy(desc(bodyMeasurements.date))
      .limit(1);
    const [u] = await db
      .select({ w: users.weightKg })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    const bodyweightKg = bm?.w ?? u?.w ?? null;

    // one_rm PR → лучший на упражнение
    const oneRmRows = await db
      .select({
        exerciseId: personalRecords.exerciseId,
        valueKg: personalRecords.valueKg,
      })
      .from(personalRecords)
      .where(
        and(
          eq(personalRecords.userId, userId),
          eq(personalRecords.type, 'one_rm'),
        ),
      );
    const oneRmByExercise = new Map<string, number>();
    for (const r of oneRmRows) {
      const prev = oneRmByExercise.get(r.exerciseId) ?? 0;
      if (r.valueKg > prev) oneRmByExercise.set(r.exerciseId, r.valueKg);
    }
    const topOneRmKg = [...oneRmByExercise.values()]
      .sort((a, b) => b - a)
      .slice(0, 3);

    // Мощь: PR за 90 дней
    const [pc] = await db
      .select({ c: count() })
      .from(prHistory)
      .where(
        and(eq(prHistory.userId, userId), gte(prHistory.achievedAt, since90)),
      );
    const recentPrCount = Number(pc?.c ?? 0);

    // Недавние завершённые сессии
    const recentSessions = await db
      .select({
        id: workoutSessions.id,
        finishedAt: workoutSessions.finishedAt,
      })
      .from(workoutSessions)
      .where(
        and(
          eq(workoutSessions.userId, userId),
          gte(workoutSessions.finishedAt, sinceRecent),
        ),
      );
    const recentSessionIds = recentSessions.map((s) => s.id);
    const sessions28 = recentSessions.filter(
      (s) => s.finishedAt && s.finishedAt >= since28,
    ).length;

    // Сеты недавних сессий + группы мышц упражнения
    const sessionRepsMap = new Map<string, number>();
    const intensityRatios: number[] = [];
    const muscleBucketCounts: Record<string, number> = {};
    if (recentSessionIds.length) {
      const rows = await db
        .select({
          sessionId: workoutExercises.sessionId,
          exerciseId: workoutExercises.exerciseId,
          reps: workoutSets.reps,
          weightKg: workoutSets.weightKg,
          completed: workoutSets.completed,
          primaryMuscles: exercises.primaryMuscles,
        })
        .from(workoutSets)
        .innerJoin(
          workoutExercises,
          eq(workoutSets.workoutExerciseId, workoutExercises.id),
        )
        .innerJoin(exercises, eq(workoutExercises.exerciseId, exercises.id))
        .where(inArray(workoutExercises.sessionId, recentSessionIds));

      for (const r of rows) {
        if (!r.completed) continue;
        if (r.reps && r.reps > 0) {
          sessionRepsMap.set(
            r.sessionId,
            (sessionRepsMap.get(r.sessionId) ?? 0) + r.reps,
          );
        }
        const oneRm = oneRmByExercise.get(r.exerciseId);
        if (oneRm && r.weightKg && r.weightKg > 0) {
          intensityRatios.push(Math.min(r.weightKg / oneRm, INTENSITY_STORE_CAP));
        }
        const bucket = bucketOf(r.primaryMuscles);
        if (bucket)
          muscleBucketCounts[bucket] = (muscleBucketCounts[bucket] ?? 0) + 1;
      }
    }

    const [st] = await db
      .select({ c: streaks.currentCount })
      .from(streaks)
      .where(eq(streaks.userId, userId))
      .limit(1);
    const currentStreak = st?.c ?? 0;

    return {
      bodyweightKg,
      topOneRmKg,
      recentPrCount,
      sessionReps: [...sessionRepsMap.values()],
      intensityRatios,
      currentStreak,
      sessions28,
      muscleBucketCounts,
    };
  }
}
