-- AI-совет по тренировке: кэш весов/повторов для (session, exercise).
-- Считается один раз при первом открытии превью тренировки.

CREATE TABLE IF NOT EXISTS "workout_advice" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "session_id" uuid NOT NULL REFERENCES "workout_sessions"("id") ON DELETE CASCADE,
  "exercise_id" uuid NOT NULL REFERENCES "exercises"("id") ON DELETE CASCADE,
  "suggested_weight_kg" real,
  "suggested_reps" integer,
  "suggested_sets" integer,
  "reason" text NOT NULL,
  "generated_at" timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "workout_advice_session_exercise_idx"
  ON "workout_advice" ("session_id", "exercise_id");
