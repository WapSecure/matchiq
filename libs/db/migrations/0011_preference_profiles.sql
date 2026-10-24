CREATE TABLE "preference_profiles" (
	"org_id" text NOT NULL,
	"user_id" text NOT NULL,
	"persona" text NOT NULL,
	"locale" text NOT NULL,
	"favourite_team_id" text,
	"followed_player_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"reduced_motion" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "preference_profiles_pk" PRIMARY KEY("org_id","user_id"),
	CONSTRAINT "preference_profiles_followed_is_array" CHECK (jsonb_typeof("preference_profiles"."followed_player_ids") = 'array')
);
--> statement-breakpoint
-- ADR-0018: the same tenant isolation policy 0004 gives every org_id table.
ALTER TABLE "preference_profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "preference_profiles_tenant_isolation" ON "preference_profiles" TO "matchiq_app" USING ("org_id" = current_setting('app.org_id', true)) WITH CHECK ("org_id" = current_setting('app.org_id', true));--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON "preference_profiles" TO "matchiq_app";
