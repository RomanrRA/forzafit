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
    email: text('email').notNull(),
    passwordHash: text('password_hash').notNull(),
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
  (t) => [uniqueIndex('users_email_idx').on(t.email)],
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

// ─── Password Resets ──────────────────────────────────────────────────────────

export const passwordResets = pgTable(
  'password_resets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    usedAt: timestamp('used_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [
    index('password_resets_user_id_idx').on(t.userId),
    uniqueIndex('password_resets_token_hash_idx').on(t.tokenHash),
  ],
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
    restTimerSec: integer('rest_timer_sec'),
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

// ─── Body Measurements ───────────────────────────────────────────────────

export const bodyMeasurements = pgTable(
  'body_measurements',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    date: timestamp('date', { mode: 'date' }).notNull(),
    weightKg: real('weight_kg'),
    bodyFatPct: real('body_fat_pct'),
    chestCm: real('chest_cm'),
    waistCm: real('waist_cm'),
    hipsCm: real('hips_cm'),
    armCm: real('arm_cm'),
    custom: jsonb('custom').$type<{ fieldId: string; name: string; value: number; unit: string }[]>(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => [
    index('body_measurements_user_id_idx').on(t.userId),
    index('body_measurements_date_idx').on(t.date),
  ],
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

// ─── Gamification: Streaks ────────────────────────────────────────────────────

export const streaks = pgTable('streaks', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  currentCount: integer('current_count').notNull().default(0),
  longestCount: integer('longest_count').notNull().default(0),
  lastActivityDate: timestamp('last_activity_date', { mode: 'date' }),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ─── Gamification: Achievements Catalog ───────────────────────────────────────

export const achievementCategoryEnum = pgEnum('achievement_category', [
  'consistency',
  'strength',
  'volume',
  'milestone',
  'time',
  'social',
]);

export const achievementsCatalog = pgTable(
  'achievements_catalog',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    code: text('code').notNull(),
    title: text('title').notNull(),
    description: text('description').notNull(),
    emoji: text('emoji').notNull(),
    category: achievementCategoryEnum('category').notNull(),
    points: integer('points').notNull().default(10),
    threshold: real('threshold'),
    condition: jsonb('condition').notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [uniqueIndex('achievements_catalog_code_idx').on(t.code)],
);

// ─── Gamification: User Achievements ──────────────────────────────────────────

export const userAchievements = pgTable(
  'user_achievements',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    achievementId: uuid('achievement_id')
      .notNull()
      .references(() => achievementsCatalog.id, { onDelete: 'cascade' }),
    unlockedAt: timestamp('unlocked_at').defaultNow().notNull(),
    workoutSessionId: uuid('workout_session_id').references(
      () => workoutSessions.id,
      { onDelete: 'set null' },
    ),
  },
  (t) => [
    uniqueIndex('user_achievements_user_achievement_idx').on(
      t.userId,
      t.achievementId,
    ),
    index('user_achievements_user_id_idx').on(t.userId),
  ],
);

// ─── Gamification: Personal Records ───────────────────────────────────────────

export const prTypeEnum = pgEnum('pr_type', [
  'one_rm',
  'working_weight',
  'volume_session',
]);

export const personalRecords = pgTable(
  'personal_records',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    exerciseId: uuid('exercise_id')
      .notNull()
      .references(() => exercises.id, { onDelete: 'cascade' }),
    type: prTypeEnum('type').notNull(),
    valueKg: real('value_kg').notNull(),
    reps: integer('reps'),
    achievedAt: timestamp('achieved_at').defaultNow().notNull(),
    workoutSessionId: uuid('workout_session_id').references(
      () => workoutSessions.id,
      { onDelete: 'set null' },
    ),
  },
  (t) => [
    uniqueIndex('personal_records_user_exercise_type_idx').on(
      t.userId,
      t.exerciseId,
      t.type,
    ),
    index('personal_records_user_id_idx').on(t.userId),
  ],
);

export const prHistory = pgTable(
  'pr_history',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    exerciseId: uuid('exercise_id')
      .notNull()
      .references(() => exercises.id, { onDelete: 'cascade' }),
    type: prTypeEnum('type').notNull(),
    previousValueKg: real('previous_value_kg'),
    valueKg: real('value_kg').notNull(),
    reps: integer('reps'),
    workoutSessionId: uuid('workout_session_id').references(
      () => workoutSessions.id,
      { onDelete: 'set null' },
    ),
    achievedAt: timestamp('achieved_at').defaultNow().notNull(),
  },
  (t) => [
    index('pr_history_user_id_idx').on(t.userId),
    index('pr_history_user_exercise_idx').on(t.userId, t.exerciseId),
  ],
);

// ─── AI Conversations ─────────────────────────────────────────────────────────

export const aiConversationStatusEnum = pgEnum('ai_conversation_status', [
  'active',
  'finalized',
  'abandoned',
]);

export const aiConversations = pgTable(
  'ai_conversations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    messages: jsonb('messages').notNull().default([]),
    context: jsonb('context'),
    status: aiConversationStatusEnum('status').notNull().default('active'),
    planTemplateId: uuid('plan_template_id').references(() => planTemplates.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => [
    index('ai_conversations_user_id_created_at_idx').on(t.userId, t.createdAt),
  ],
);

// ─── Relations ────────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ many, one }) => ({
  refreshTokens: many(refreshTokens),
  passwordResets: many(passwordResets),
  workoutSessions: many(workoutSessions),
  exercises: many(exercises),
  syncEvents: many(syncEvents),
  planTemplates: many(planTemplates),
  bodyMeasurements: many(bodyMeasurements),
  aiConversations: many(aiConversations),
  streak: one(streaks, {
    fields: [users.id],
    references: [streaks.userId],
  }),
  achievements: many(userAchievements),
  personalRecords: many(personalRecords),
}));

export const streaksRelations = relations(streaks, ({ one }) => ({
  user: one(users, {
    fields: [streaks.userId],
    references: [users.id],
  }),
}));

export const achievementsCatalogRelations = relations(
  achievementsCatalog,
  ({ many }) => ({
    userAchievements: many(userAchievements),
  }),
);

export const userAchievementsRelations = relations(
  userAchievements,
  ({ one }) => ({
    user: one(users, {
      fields: [userAchievements.userId],
      references: [users.id],
    }),
    achievement: one(achievementsCatalog, {
      fields: [userAchievements.achievementId],
      references: [achievementsCatalog.id],
    }),
    workoutSession: one(workoutSessions, {
      fields: [userAchievements.workoutSessionId],
      references: [workoutSessions.id],
    }),
  }),
);

export const personalRecordsRelations = relations(personalRecords, ({ one }) => ({
  user: one(users, {
    fields: [personalRecords.userId],
    references: [users.id],
  }),
  exercise: one(exercises, {
    fields: [personalRecords.exerciseId],
    references: [exercises.id],
  }),
  workoutSession: one(workoutSessions, {
    fields: [personalRecords.workoutSessionId],
    references: [workoutSessions.id],
  }),
}));

export const prHistoryRelations = relations(prHistory, ({ one }) => ({
  user: one(users, {
    fields: [prHistory.userId],
    references: [users.id],
  }),
  exercise: one(exercises, {
    fields: [prHistory.exerciseId],
    references: [exercises.id],
  }),
  workoutSession: one(workoutSessions, {
    fields: [prHistory.workoutSessionId],
    references: [workoutSessions.id],
  }),
}));

export const aiConversationsRelations = relations(aiConversations, ({ one }) => ({
  user: one(users, {
    fields: [aiConversations.userId],
    references: [users.id],
  }),
  planTemplate: one(planTemplates, {
    fields: [aiConversations.planTemplateId],
    references: [planTemplates.id],
  }),
}));

export const passwordResetsRelations = relations(passwordResets, ({ one }) => ({
  user: one(users, {
    fields: [passwordResets.userId],
    references: [users.id],
  }),
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

export const bodyMeasurementsRelations = relations(bodyMeasurements, ({ one }) => ({
  user: one(users, {
    fields: [bodyMeasurements.userId],
    references: [users.id],
  }),
}));
