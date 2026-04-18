CREATE TABLE IF NOT EXISTS "body_measurements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"date" timestamp NOT NULL,
	"weight_kg" real,
	"body_fat_pct" real,
	"chest_cm" real,
	"waist_cm" real,
	"hips_cm" real,
	"arm_cm" real,
	"custom" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "body_measurements" ADD CONSTRAINT "body_measurements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "body_measurements_user_id_idx" ON "body_measurements" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "body_measurements_date_idx" ON "body_measurements" USING btree ("date");