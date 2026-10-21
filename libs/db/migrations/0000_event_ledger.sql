CREATE TABLE "audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" text NOT NULL,
	"actor" text NOT NULL,
	"action" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text NOT NULL,
	"request_id" text,
	"details" jsonb NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fixtures" (
	"org_id" text NOT NULL,
	"fixture_id" text NOT NULL,
	"status" text NOT NULL,
	"title" text NOT NULL,
	"kickoff_utc" timestamp (3) with time zone NOT NULL,
	"schema_version" integer NOT NULL,
	"payload" jsonb NOT NULL,
	"payload_hash" char(64) NOT NULL,
	"provenance" jsonb NOT NULL,
	"stream_head" bigint DEFAULT 0 NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fixtures_pk" PRIMARY KEY("org_id","fixture_id"),
	CONSTRAINT "fixtures_stream_head_nonnegative" CHECK ("fixtures"."stream_head" >= 0)
);
--> statement-breakpoint
CREATE TABLE "idempotency_keys" (
	"org_id" text NOT NULL,
	"scope" text NOT NULL,
	"key" text NOT NULL,
	"request_hash" char(64) NOT NULL,
	"response_status" integer,
	"response_body" jsonb,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "idempotency_keys_pk" PRIMARY KEY("org_id","scope","key")
);
--> statement-breakpoint
CREATE TABLE "match_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" text NOT NULL,
	"fixture_id" text NOT NULL,
	"event_id" text NOT NULL,
	"sequence" integer NOT NULL,
	"type" text NOT NULL,
	"period" smallint NOT NULL,
	"match_clock_ms" integer NOT NULL,
	"wall_clock_utc" timestamp (3) with time zone NOT NULL,
	"schema_version" integer NOT NULL,
	"payload" jsonb NOT NULL,
	"payload_hash" char(64) NOT NULL,
	"ingestion_id" text NOT NULL,
	"ingested_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "match_events_sequence_uq" UNIQUE("org_id","fixture_id","sequence"),
	CONSTRAINT "match_events_event_id_uq" UNIQUE("org_id","fixture_id","event_id"),
	CONSTRAINT "match_events_sequence_nonnegative" CHECK ("match_events"."sequence" >= 0),
	CONSTRAINT "match_events_clock_nonnegative" CHECK ("match_events"."match_clock_ms" >= 0)
);
--> statement-breakpoint
CREATE TABLE "stream_messages" (
	"org_id" text NOT NULL,
	"fixture_id" text NOT NULL,
	"stream_sequence" bigint NOT NULL,
	"type" text NOT NULL,
	"message" jsonb NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp (3) with time zone,
	CONSTRAINT "stream_messages_pk" PRIMARY KEY("org_id","fixture_id","stream_sequence"),
	CONSTRAINT "stream_messages_sequence_positive" CHECK ("stream_messages"."stream_sequence" > 0)
);
--> statement-breakpoint
ALTER TABLE "match_events" ADD CONSTRAINT "match_events_fixture_fk" FOREIGN KEY ("org_id","fixture_id") REFERENCES "public"."fixtures"("org_id","fixture_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stream_messages" ADD CONSTRAINT "stream_messages_fixture_fk" FOREIGN KEY ("org_id","fixture_id") REFERENCES "public"."fixtures"("org_id","fixture_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_events_target_idx" ON "audit_events" USING btree ("org_id","target_type","target_id","created_at");--> statement-breakpoint
CREATE INDEX "fixtures_org_kickoff_idx" ON "fixtures" USING btree ("org_id","kickoff_utc","fixture_id");--> statement-breakpoint
CREATE INDEX "match_events_clock_idx" ON "match_events" USING btree ("org_id","fixture_id","period","match_clock_ms");--> statement-breakpoint
CREATE INDEX "stream_messages_unpublished_idx" ON "stream_messages" USING btree ("org_id","fixture_id","stream_sequence") WHERE "stream_messages"."published_at" is null;