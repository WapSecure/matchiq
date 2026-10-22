CREATE TABLE "editorial_controls" (
	"org_id" text NOT NULL,
	"scope_type" text NOT NULL,
	"scope_id" text NOT NULL,
	"active" boolean NOT NULL,
	"reason" text NOT NULL,
	"changed_by" text NOT NULL,
	"changed_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "editorial_controls_pk" PRIMARY KEY("org_id","scope_type","scope_id"),
	CONSTRAINT "editorial_controls_scope_valid" CHECK ("editorial_controls"."scope_type" in ('ORG', 'FIXTURE'))
);
--> statement-breakpoint
ALTER TABLE "audit_events" ADD COLUMN "actor_type" text DEFAULT 'OPERATOR' NOT NULL;--> statement-breakpoint
ALTER TABLE "audit_events" ADD COLUMN "fixture_id" text;--> statement-breakpoint
ALTER TABLE "audit_events" ADD COLUMN "reason" text;--> statement-breakpoint
ALTER TABLE "audit_events" ADD COLUMN "correlation_id" text;--> statement-breakpoint
ALTER TABLE "audit_events" ADD COLUMN "before" jsonb;--> statement-breakpoint
ALTER TABLE "audit_events" ADD COLUMN "after" jsonb;--> statement-breakpoint
ALTER TABLE "insights" ADD COLUMN "editorial_state" text;--> statement-breakpoint
ALTER TABLE "insights" ADD COLUMN "editorial_reason" text;--> statement-breakpoint
ALTER TABLE "overlay_cues" ADD COLUMN "editorial_state" text;--> statement-breakpoint
ALTER TABLE "overlay_cues" ADD COLUMN "editorial_reason" text;--> statement-breakpoint
CREATE INDEX "audit_events_recent_idx" ON "audit_events" USING btree ("org_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "audit_events_fixture_idx" ON "audit_events" USING btree ("org_id","fixture_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "audit_events_action_idx" ON "audit_events" USING btree ("org_id","action","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "insights_id_idx" ON "insights" USING btree ("org_id","insight_id");--> statement-breakpoint
CREATE INDEX "overlay_cues_id_idx" ON "overlay_cues" USING btree ("org_id","overlay_id");--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_type_valid" CHECK ("audit_events"."actor_type" in ('OPERATOR', 'SYSTEM', 'ANONYMOUS'));--> statement-breakpoint
UPDATE "audit_events" SET "actor_type" = 'ANONYMOUS' WHERE "actor" = 'anonymous-viewer';--> statement-breakpoint
UPDATE "audit_events" SET "actor_type" = 'SYSTEM' WHERE "actor" LIKE 'system:%';--> statement-breakpoint
UPDATE "audit_events" SET "fixture_id" = "target_id" WHERE "target_type" = 'fixture';--> statement-breakpoint
CREATE FUNCTION "audit_events_append_only"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
	RAISE EXCEPTION 'audit_events is append-only' USING ERRCODE = 'insufficient_privilege';
END;
$$;--> statement-breakpoint
CREATE TRIGGER "audit_events_no_update_delete" BEFORE UPDATE OR DELETE ON "audit_events" FOR EACH ROW EXECUTE FUNCTION "audit_events_append_only"();
