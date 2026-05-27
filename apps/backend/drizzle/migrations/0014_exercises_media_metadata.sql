-- Расширяем exercises полями для медиа-описаний из free-exercise-db.
-- Старые упражнения остаются работоспособными — все новые поля nullable / default '{}'.

ALTER TABLE "exercises"
  ADD COLUMN IF NOT EXISTS "source_id" text,
  ADD COLUMN IF NOT EXISTS "primary_muscles" text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "secondary_muscles" text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "instructions" text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "image_urls" text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "category" text,
  ADD COLUMN IF NOT EXISTS "force" text,
  ADD COLUMN IF NOT EXISTS "mechanic" text;

-- Идемпотентный апсёрт по source_id (один ключ на один источник).
CREATE UNIQUE INDEX IF NOT EXISTS "exercises_source_id_idx"
  ON "exercises" ("source_id")
  WHERE "source_id" IS NOT NULL;
