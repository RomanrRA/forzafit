-- Добавляем недостающие обхваты в body_measurements: бедро, предплечье, икра, шея.
-- Нужны для полного покрытия body-морфов аватара без ручных ползунков.

ALTER TABLE "body_measurements" ADD COLUMN IF NOT EXISTS "thigh_cm" real;
ALTER TABLE "body_measurements" ADD COLUMN IF NOT EXISTS "forearm_cm" real;
ALTER TABLE "body_measurements" ADD COLUMN IF NOT EXISTS "calf_cm" real;
ALTER TABLE "body_measurements" ADD COLUMN IF NOT EXISTS "neck_cm" real;
