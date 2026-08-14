CREATE TABLE "academy_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"singleton_key" integer DEFAULT 1 NOT NULL,
	"academy_name" varchar(150) NOT NULL,
	"phone_normalized" varchar(20) NOT NULL,
	"address" text NOT NULL,
	"logo_media_id" uuid,
	"sender_name" varchar(100) NOT NULL,
	"brand_colors" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"brand_fonts" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "academy_settings_singleton_key_check" CHECK ("academy_settings"."singleton_key" = 1)
);
--> statement-breakpoint
CREATE TABLE "grade_levels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(80) NOT NULL,
	"name_normalized" varchar(80) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "grade_levels_sort_order_nonnegative" CHECK ("grade_levels"."sort_order" >= 0)
);
--> statement-breakpoint
CREATE TABLE "schools" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(120) NOT NULL,
	"name_normalized" varchar(120) NOT NULL,
	"region" varchar(120),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "schools_sort_order_nonnegative" CHECK ("schools"."sort_order" >= 0)
);
--> statement-breakpoint
ALTER TABLE "academy_settings" ADD CONSTRAINT "academy_settings_updated_by_admins_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grade_levels" ADD CONSTRAINT "grade_levels_created_by_admins_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grade_levels" ADD CONSTRAINT "grade_levels_updated_by_admins_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schools" ADD CONSTRAINT "schools_created_by_admins_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schools" ADD CONSTRAINT "schools_updated_by_admins_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "academy_settings_singleton_unique" ON "academy_settings" USING btree ("singleton_key");--> statement-breakpoint
CREATE INDEX "academy_settings_updated_at_idx" ON "academy_settings" USING btree ("updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "grade_levels_active_name_unique" ON "grade_levels" USING btree ("name_normalized") WHERE "grade_levels"."is_active" = true AND "grade_levels"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "grade_levels_active_sort_idx" ON "grade_levels" USING btree ("is_active","sort_order");--> statement-breakpoint
CREATE INDEX "grade_levels_deleted_at_idx" ON "grade_levels" USING btree ("deleted_at");--> statement-breakpoint
CREATE UNIQUE INDEX "schools_active_name_unique" ON "schools" USING btree ("name_normalized") WHERE "schools"."is_active" = true AND "schools"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "schools_active_sort_idx" ON "schools" USING btree ("is_active","sort_order");--> statement-breakpoint
CREATE INDEX "schools_deleted_at_idx" ON "schools" USING btree ("deleted_at");