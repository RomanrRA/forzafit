DO $$ BEGIN
 CREATE TYPE "public"."quest_status" AS ENUM('suggested', 'active', 'completed', 'failed', 'abandoned');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."quest_source" AS ENUM('ai', 'manual', 'template');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."quest_type" AS ENUM('workout_count', 'streak_keep', 'pr_in_exercise', 'total_volume', 'exercise_frequency', 'weekday_consistency');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TYPE "public"."feed_event_type" ADD VALUE IF NOT EXISTS 'quest_completed';
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_quests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"type" "quest_type" NOT NULL,
	"target" jsonb NOT NULL,
	"progress" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"reward_points" integer DEFAULT 20 NOT NULL,
	"status" "quest_status" DEFAULT 'suggested' NOT NULL,
	"source" "quest_source" DEFAULT 'ai' NOT NULL,
	"duration_days" integer NOT NULL,
	"started_at" timestamp,
	"expires_at" timestamp,
	"completed_at" timestamp,
	"ai_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_quests" ADD CONSTRAINT "user_quests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_quests_user_id_idx" ON "user_quests" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_quests_user_status_idx" ON "user_quests" USING btree ("user_id","status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_quests_expires_at_idx" ON "user_quests" USING btree ("expires_at");
