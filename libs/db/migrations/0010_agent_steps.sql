CREATE TABLE "agent_steps" (
	"org_id" text NOT NULL,
	"fixture_id" text NOT NULL,
	"insight_id" text NOT NULL,
	"correlation_id" uuid NOT NULL,
	"run_id" text NOT NULL,
	"step_index" smallint NOT NULL,
	"role" text NOT NULL,
	"decision" text NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "agent_steps_pk" PRIMARY KEY("org_id","correlation_id","step_index")
);
--> statement-breakpoint
ALTER TABLE "agent_steps" ADD CONSTRAINT "agent_steps_fixture_fk" FOREIGN KEY ("org_id","fixture_id") REFERENCES "public"."fixtures"("org_id","fixture_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agent_steps_insight_idx" ON "agent_steps" USING btree ("org_id","fixture_id","insight_id");--> statement-breakpoint
-- ADR-0018: tenant isolation, as migration 0004 applies to every org_id table.
ALTER TABLE "agent_steps" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "agent_steps_tenant_isolation" ON "agent_steps" TO "matchiq_app" USING ("org_id" = current_setting('app.org_id', true)) WITH CHECK ("org_id" = current_setting('app.org_id', true));--> statement-breakpoint
GRANT SELECT, INSERT, DELETE ON "agent_steps" TO "matchiq_app";
