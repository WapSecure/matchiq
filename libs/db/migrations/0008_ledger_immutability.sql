ALTER TABLE "narratives" ADD COLUMN "retracted_at" timestamp (3) with time zone;--> statement-breakpoint
-- ADR-0006/ADR-0015: the event ledger is append-only for every role. Corrections
-- are new CORRECTION events. Retention removes whole expired ledgers only through
-- purge_match_ledger, which sets a transaction-local flag this trigger accepts.
CREATE FUNCTION "match_events_append_only"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
	IF TG_OP = 'DELETE' AND current_setting('matchiq.ledger_purge', true) = 'on' THEN
		RETURN OLD;
	END IF;
	RAISE EXCEPTION 'match_events is append-only' USING ERRCODE = 'insufficient_privilege';
END;
$$;--> statement-breakpoint
CREATE TRIGGER "match_events_no_update_delete" BEFORE UPDATE OR DELETE ON "match_events" FOR EACH ROW EXECUTE FUNCTION "match_events_append_only"();--> statement-breakpoint
REVOKE UPDATE, DELETE ON "match_events" FROM "matchiq_app";--> statement-breakpoint
CREATE FUNCTION "purge_match_ledger"("p_org_ids" text[], "p_fixture_ids" text[]) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
	removed integer;
BEGIN
	PERFORM set_config('matchiq.ledger_purge', 'on', true);
	DELETE FROM "match_events" e
	USING unnest("p_org_ids", "p_fixture_ids") AS k(org_id, fixture_id)
	WHERE e.org_id = k.org_id AND e.fixture_id = k.fixture_id;
	GET DIAGNOSTICS removed = ROW_COUNT;
	PERFORM set_config('matchiq.ledger_purge', 'off', true);
	RETURN removed;
END;
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION "purge_match_ledger"(text[], text[]) FROM PUBLIC;
