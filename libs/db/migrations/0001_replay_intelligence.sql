CREATE TABLE "agent_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" text NOT NULL,
	"fixture_id" text NOT NULL,
	"insight_id" text NOT NULL,
	"run_id" text NOT NULL,
	"correlation_id" uuid NOT NULL,
	"agent" text NOT NULL,
	"provider" text NOT NULL,
	"outcome" text NOT NULL,
	"latency_ms" integer NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fixture_templates" (
	"org_id" text NOT NULL,
	"template_id" text NOT NULL,
	"title" text NOT NULL,
	"scenario" text NOT NULL,
	"seed" integer NOT NULL,
	"fixture" jsonb NOT NULL,
	"events" jsonb NOT NULL,
	"event_count" integer NOT NULL,
	"events_hash" char(64) NOT NULL,
	"final_score" jsonb NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fixture_templates_pk" PRIMARY KEY("org_id","template_id")
);
--> statement-breakpoint
CREATE TABLE "insights" (
	"org_id" text NOT NULL,
	"fixture_id" text NOT NULL,
	"insight_id" text NOT NULL,
	"revision" integer NOT NULL,
	"kind" text NOT NULL,
	"priority" text NOT NULL,
	"period" smallint NOT NULL,
	"match_clock_ms" integer NOT NULL,
	"status" text NOT NULL,
	"publication" text NOT NULL,
	"payload" jsonb NOT NULL,
	"gate_report" jsonb,
	"fallback_reason" text,
	"detected_sequence" integer NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "insights_pk" PRIMARY KEY("org_id","fixture_id","insight_id")
);
--> statement-breakpoint
CREATE TABLE "match_recaps" (
	"org_id" text NOT NULL,
	"fixture_id" text NOT NULL,
	"payload" jsonb NOT NULL,
	"payload_hash" char(64) NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "match_recaps_pk" PRIMARY KEY("org_id","fixture_id")
);
--> statement-breakpoint
CREATE TABLE "match_snapshots" (
	"org_id" text NOT NULL,
	"fixture_id" text NOT NULL,
	"through_sequence" integer NOT NULL,
	"payload" jsonb NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "match_snapshots_pk" PRIMARY KEY("org_id","fixture_id"),
	CONSTRAINT "match_snapshots_sequence_valid" CHECK ("match_snapshots"."through_sequence" >= -1)
);
--> statement-breakpoint
CREATE TABLE "narratives" (
	"org_id" text NOT NULL,
	"fixture_id" text NOT NULL,
	"narrative_id" text NOT NULL,
	"insight_id" text NOT NULL,
	"persona" text NOT NULL,
	"locale" text NOT NULL,
	"source" text NOT NULL,
	"revision" integer NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "narratives_pk" PRIMARY KEY("org_id","fixture_id","narrative_id"),
	CONSTRAINT "narratives_variant_uq" UNIQUE("org_id","fixture_id","insight_id","persona","locale","revision")
);
--> statement-breakpoint
CREATE TABLE "overlay_cues" (
	"org_id" text NOT NULL,
	"fixture_id" text NOT NULL,
	"overlay_id" text NOT NULL,
	"insight_id" text,
	"revision" integer NOT NULL,
	"status" text NOT NULL,
	"priority" integer NOT NULL,
	"period" smallint NOT NULL,
	"clock_start_ms" integer NOT NULL,
	"clock_end_ms" integer NOT NULL,
	"payload" jsonb NOT NULL,
	"end_reason" text,
	"published_sequence" integer NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "overlay_cues_pk" PRIMARY KEY("org_id","fixture_id","overlay_id")
);
--> statement-breakpoint
CREATE TABLE "replay_sessions" (
	"org_id" text NOT NULL,
	"fixture_id" text NOT NULL,
	"template_id" text NOT NULL,
	"session_number" integer NOT NULL,
	"state" text NOT NULL,
	"speed" smallint NOT NULL,
	"applied_sequence" integer DEFAULT -1 NOT NULL,
	"period" smallint,
	"match_clock_ms" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "replay_sessions_pk" PRIMARY KEY("org_id","fixture_id"),
	CONSTRAINT "replay_sessions_number_uq" UNIQUE("org_id","template_id","session_number")
);
--> statement-breakpoint
ALTER TABLE "agent_runs" ADD CONSTRAINT "agent_runs_fixture_fk" FOREIGN KEY ("org_id","fixture_id") REFERENCES "public"."fixtures"("org_id","fixture_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "insights" ADD CONSTRAINT "insights_fixture_fk" FOREIGN KEY ("org_id","fixture_id") REFERENCES "public"."fixtures"("org_id","fixture_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_recaps" ADD CONSTRAINT "match_recaps_fixture_fk" FOREIGN KEY ("org_id","fixture_id") REFERENCES "public"."fixtures"("org_id","fixture_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_snapshots" ADD CONSTRAINT "match_snapshots_fixture_fk" FOREIGN KEY ("org_id","fixture_id") REFERENCES "public"."fixtures"("org_id","fixture_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "narratives" ADD CONSTRAINT "narratives_fixture_fk" FOREIGN KEY ("org_id","fixture_id") REFERENCES "public"."fixtures"("org_id","fixture_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "overlay_cues" ADD CONSTRAINT "overlay_cues_fixture_fk" FOREIGN KEY ("org_id","fixture_id") REFERENCES "public"."fixtures"("org_id","fixture_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "replay_sessions" ADD CONSTRAINT "replay_sessions_fixture_fk" FOREIGN KEY ("org_id","fixture_id") REFERENCES "public"."fixtures"("org_id","fixture_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "replay_sessions" ADD CONSTRAINT "replay_sessions_template_fk" FOREIGN KEY ("org_id","template_id") REFERENCES "public"."fixture_templates"("org_id","template_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agent_runs_insight_idx" ON "agent_runs" USING btree ("org_id","fixture_id","insight_id");--> statement-breakpoint
CREATE INDEX "agent_runs_correlation_idx" ON "agent_runs" USING btree ("org_id","correlation_id");--> statement-breakpoint
CREATE INDEX "insights_order_idx" ON "insights" USING btree ("org_id","fixture_id","detected_sequence");--> statement-breakpoint
CREATE INDEX "overlay_cues_clock_idx" ON "overlay_cues" USING btree ("org_id","fixture_id","period","clock_start_ms");--> statement-breakpoint
CREATE INDEX "replay_sessions_created_idx" ON "replay_sessions" USING btree ("org_id","created_at");