ALTER TABLE "users" ADD COLUMN "calendar_token" uuid;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "users_calendar_token_idx" ON "users" USING btree ("calendar_token");