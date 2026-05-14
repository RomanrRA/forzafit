CREATE TABLE IF NOT EXISTS "body_goals" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"weight_kg" real,
	"body_fat_pct" real,
	"chest_cm" real,
	"waist_cm" real,
	"hips_cm" real,
	"arm_cm" real,
	"thigh_cm" real,
	"target_date" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "body_goals" ADD CONSTRAINT "body_goals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
