ALTER TABLE "match_events" DROP CONSTRAINT "match_events_fixture_fk";
--> statement-breakpoint
ALTER TABLE "stream_messages" DROP CONSTRAINT "stream_messages_fixture_fk";
--> statement-breakpoint
ALTER TABLE "agent_runs" DROP CONSTRAINT "agent_runs_fixture_fk";
--> statement-breakpoint
ALTER TABLE "insights" DROP CONSTRAINT "insights_fixture_fk";
--> statement-breakpoint
ALTER TABLE "match_recaps" DROP CONSTRAINT "match_recaps_fixture_fk";
--> statement-breakpoint
ALTER TABLE "match_snapshots" DROP CONSTRAINT "match_snapshots_fixture_fk";
--> statement-breakpoint
ALTER TABLE "narratives" DROP CONSTRAINT "narratives_fixture_fk";
--> statement-breakpoint
ALTER TABLE "overlay_cues" DROP CONSTRAINT "overlay_cues_fixture_fk";
--> statement-breakpoint
ALTER TABLE "replay_sessions" DROP CONSTRAINT "replay_sessions_fixture_fk";
--> statement-breakpoint
ALTER TABLE "match_events" ADD CONSTRAINT "match_events_fixture_fk" FOREIGN KEY ("org_id","fixture_id") REFERENCES "public"."fixtures"("org_id","fixture_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stream_messages" ADD CONSTRAINT "stream_messages_fixture_fk" FOREIGN KEY ("org_id","fixture_id") REFERENCES "public"."fixtures"("org_id","fixture_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_runs" ADD CONSTRAINT "agent_runs_fixture_fk" FOREIGN KEY ("org_id","fixture_id") REFERENCES "public"."fixtures"("org_id","fixture_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "insights" ADD CONSTRAINT "insights_fixture_fk" FOREIGN KEY ("org_id","fixture_id") REFERENCES "public"."fixtures"("org_id","fixture_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_recaps" ADD CONSTRAINT "match_recaps_fixture_fk" FOREIGN KEY ("org_id","fixture_id") REFERENCES "public"."fixtures"("org_id","fixture_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_snapshots" ADD CONSTRAINT "match_snapshots_fixture_fk" FOREIGN KEY ("org_id","fixture_id") REFERENCES "public"."fixtures"("org_id","fixture_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "narratives" ADD CONSTRAINT "narratives_fixture_fk" FOREIGN KEY ("org_id","fixture_id") REFERENCES "public"."fixtures"("org_id","fixture_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "overlay_cues" ADD CONSTRAINT "overlay_cues_fixture_fk" FOREIGN KEY ("org_id","fixture_id") REFERENCES "public"."fixtures"("org_id","fixture_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "replay_sessions" ADD CONSTRAINT "replay_sessions_fixture_fk" FOREIGN KEY ("org_id","fixture_id") REFERENCES "public"."fixtures"("org_id","fixture_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idempotency_keys_created_idx" ON "idempotency_keys" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "insights_pending_idx" ON "insights" USING btree ("org_id","created_at") WHERE "insights"."publication" = 'PENDING';--> statement-breakpoint
CREATE INDEX "replay_sessions_activity_idx" ON "replay_sessions" USING btree ("org_id","state","updated_at");--> statement-breakpoint
CREATE INDEX "replay_sessions_updated_idx" ON "replay_sessions" USING btree ("updated_at");