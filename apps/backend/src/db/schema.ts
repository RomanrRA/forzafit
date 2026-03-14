import {
  pgTable,
  uuid,
  text,
  real,
  integer,
  boolean,
  timestamp,
  pgEnum,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ─── Enums ────────────────────────────────────────────────────────────────────

export const genderEnum = pgEnum('gender', ['male', 'female', 'other']);

export const goalEnum = pgEnum('goal', [
  'lose_weight',
  'maintain',
  'gain_muscle',
  'improve_endurance',
]);

export const appModeEnum = pgEnum('app_mode', [
  'workouts',
  'nutrition',
  'full',
]);

export const subscriptionTierEnum = pgEnum('subscription_tier', [
  'free',
  'premium_workout',
  'premium_nutrition',
  'premium_full',
]);

export const difficultyEnum = pgEnum('difficulty', [
  'beginner',
  'intermediate',
  'advanced',
]);

export const syncActionEnum = pgEnum('sync_action', [
  'create',
  'update',
  'delete',
]);

export const syncEntityTypeEnum = pgEnum('sync_entity_type', [
  'workout',
  'workout_exercise',
  'workout_set',
  'exercise',
  'body_measurement',
  'food_entry',
]);

// ─── Users ────────────────────────────────────────────────────────────────────

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    firebaseUid: text('firebase_uid').notNull(),
    email: text('email').notNull(),
    name: text('name'),
    gender: genderEnum('gender'),
    dob: timestamp('dob', { mode: 'date' }),
    heightCm: real('height_cm'),
    weightKg: real('weight_kg'),
    goal: goalEnum('goal'),
    appMode: appModeEnum('app_mode').default('workouts').notNull(),
    subscriptionTier: subscriptionTierEnum('subscription_tier')
      .default('free')
      .notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex('users_firebase_uid_idx').on(t.firebaseUid),
    uniqueIndex('users_email_idx').on(t.email),
  ],
);

// ─── Refresh Tokens ───────────────────────────────────────────────────────────

export const refreshTokens = pgTable(
  'refresh_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    revoked: boolean('revoked').default(false).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [index('refresh_tokens_user_id_idx').on(t.userId)],
);

// ─── Exercises ────────────────────────────────────────────────────────────────

export const exercises = pgTable(
  'exercises',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    muscleGroups: text('muscle_groups').array().notNull().default([]),
    equipment: text('equipment'),
    difficulty: difficultyEnum('difficulty'),
    description: text('description'),
    animationUrl: text('animation_url'),
    isCustom: boolean('is_custom').default(false).notNull(),
    userId: uuid('user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [index('exercises_user_id_idx').on(t.userId)],
);

// ─── Workout Sessions ─────────────────────────────────────────────────────────

export const workoutSessions = pgTable(
  'workout_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: text('title'),
    startedAt: timestamp('started_at'),
    finishedAt: timestamp('finished_at'),
    notes: text('notes'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => [
    index('workout_sessions_user_id_idx').on(t.userId),
    index('workout_sessions_started_at_idx').on(t.startedAt),
  ],
);

// ─── Workout Exercises ────────────────────────────────────────────────────────

export const workoutExercises = pgTable(
  'workout_exercises',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => workoutSessions.id, { onDelete: 'cascade' }),
    exerciseId: uuid('exercise_id')
      .notNull()
      .references(() => exercises.id, { onDelete: 'restrict' }),
    orderIndex: integer('order_index').notNull().default(0),
    notes: text('notes'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [index('workout_exercises_session_id_idx').on(t.sessionId)],
);

// ─── Workout Sets ─────────────────────────────────────────────────────────────

export const workoutSets = pgTable(
  'workout_sets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workoutExerciseId: uuid('workout_exercise_id')
      .notNull()
      .references(() => workoutExercises.id, { onDelete: 'cascade' }),
    weightKg: real('weight_kg'),
    reps: integer('reps'),
    completed: boolean('completed').default(false).notNull(),
    restTimerSec: integer('rest_timer_sec'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [
    index('workout_sets_workout_exercise_id_idx').on(t.workoutExerciseId),
  ],
);

// ─── Plan Templates ───────────────────────────────────────────────────────────

export const planTemplates = pgTable(
  'plan_templates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    goal: text('goal'),
    difficulty: difficultyEnum('difficulty'),
    type: text('type'),
    daysPerWeek: integer('days_per_week').notNull().default(3),
    duration: text('duration'),
    days: jsonb('days').notNull().default([]),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => [index('plan_templates_user_id_idx').on(t.userId)],
);

// ─── Sync Events ──────────────────────────────────────────────────────────────

export const syncEvents = pgTable(
  'sync_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    entityType: syncEntityTypeEnum('entity_type').notNull(),
    entityId: uuid('entity_id').notNull(),
    action: syncActionEnum('action').notNull(),
    payload: jsonb('payload'),
    clientUpdatedAt: timestamp('client_updated_at').notNull(),
    processedAt: timestamp('processed_at').defaultNow().notNull(),
  },
  (t) => [
    index('sync_events_user_id_idx').on(t.userId),
    index('sync_events_processed_at_idx').on(t.processedAt),
    index('sync_events_client_updated_at_idx').on(t.clientUpdatedAt),
  ],
);

// ─── Relations ────────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ many }) => ({
  refreshTokens: many(refreshTokens),
  workoutSessions: many(workoutSessions),
  exercises: many(exercises),
  syncEvents: many(syncEvents),
  planTemplates: many(planTemplates),
}));

export const workoutSessionsRelations = relations(
  workoutSessions,
  ({ one, many }) => ({
    user: one(users, {
      fields: [workoutSessions.userId],
      references: [users.id],
    }),
    workoutExercises: many(workoutExercises),
  }),
);

export const workoutExercisesRelations = relations(
  workoutExercises,
  ({ one, many }) => ({
    session: one(workoutSessions, {
      fields: [workoutExercises.sessionId],
      references: [workoutSessions.id],
    }),
    exercise: one(exercises, {
      fields: [workoutExercises.exerciseId],
      references: [exercises.id],
    }),
    sets: many(workoutSets),
  }),
);

export const workoutSetsRelations = relations(workoutSets, ({ one }) => ({
  workoutExercise: one(workoutExercises, {
    fields: [workoutSets.workoutExerciseId],
    references: [workoutExercises.id],
  }),
}));

export const exercisesRelations = relations(exercises, ({ one }) => ({
  user: one(users, {
    fields: [exercises.userId],
    references: [users.id],
  }),
}));
