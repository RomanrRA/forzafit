// Shared TypeScript types for FitLog

export type SubscriptionTier =
  | 'free'
  | 'premium_workout'
  | 'premium_nutrition'
  | 'premium_full';

export type AppMode = 'workouts' | 'nutrition' | 'full';

export type Gender = 'male' | 'female' | 'other';

export type Goal =
  | 'lose_weight'
  | 'maintain'
  | 'gain_muscle'
  | 'improve_endurance';

export type SyncAction = 'create' | 'update' | 'delete';

export type SyncEntityType =
  | 'workout'
  | 'workout_exercise'
  | 'workout_set'
  | 'exercise'
  | 'body_measurement'
  | 'food_entry';

export interface SyncEvent {
  id: string;
  entityType: SyncEntityType;
  entityId: string;
  action: SyncAction;
  payload?: Record<string, unknown>;
  clientUpdatedAt: string; // ISO 8601
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}
