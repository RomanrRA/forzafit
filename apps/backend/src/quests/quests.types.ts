export type QuestType =
  | 'workout_count'
  | 'streak_keep'
  | 'pr_in_exercise'
  | 'total_volume'
  | 'exercise_frequency'
  | 'weekday_consistency';

export type QuestStatus =
  | 'suggested'
  | 'active'
  | 'completed'
  | 'failed'
  | 'abandoned';

export type QuestSource = 'ai' | 'manual' | 'template';

/**
 * target — что именно нужно достичь.
 * progress — текущее состояние; считается quest-tracker'ом.
 */
export type QuestTarget =
  | { type: 'workout_count'; value: number }
  | { type: 'streak_keep'; value: number }
  | { type: 'pr_in_exercise'; exerciseId: string; exerciseName?: string }
  | { type: 'total_volume'; valueKg: number }
  | {
      type: 'exercise_frequency';
      exerciseId: string;
      exerciseName?: string;
      value: number;
    }
  | { type: 'weekday_consistency'; weekdays: number[] }; // 0=вс..6=сб

export interface QuestProgress {
  current: number;
  /** Дата старта прогресса для weekday_consistency. */
  startedAt?: string;
  /** Доп. контекст: список засчитанных тренировок и т.п. */
  events?: Array<{ sessionId?: string; at: string; delta: number }>;
}
