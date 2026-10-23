-- ADR-0018: row-level security on every tenant table. Tenant transactions run
-- `set_config('role', 'matchiq_app', true)` and `set_config('app.org_id', <org>, true)`;
-- the migrating owner keeps bypassing RLS for migrations, seeding, the outbox
-- relay and retention. Roles are cluster-wide, so creation tolerates a race with
-- another database migrating on the same server.
DO $$
BEGIN
	CREATE ROLE "matchiq_app" NOLOGIN NOINHERIT NOBYPASSRLS;
EXCEPTION WHEN duplicate_object OR unique_violation THEN
	NULL;
END
$$;--> statement-breakpoint
-- A superuser may already switch to any role; others need membership to run
-- `set_config('role', ...)`.
DO $$
BEGIN
	IF NOT (SELECT rolsuper FROM pg_roles WHERE rolname = current_user) THEN
		GRANT "matchiq_app" TO CURRENT_USER;
	END IF;
END
$$;--> statement-breakpoint
GRANT USAGE ON SCHEMA "public" TO "matchiq_app";--> statement-breakpoint
DO $$
DECLARE
	target record;
BEGIN
	FOR target IN
		SELECT c.relname
		FROM pg_class c
		JOIN pg_namespace n ON n.oid = c.relnamespace
		WHERE n.nspname = 'public'
			AND c.relkind = 'r'
			AND EXISTS (
				SELECT 1 FROM pg_attribute a
				WHERE a.attrelid = c.oid AND a.attname = 'org_id' AND NOT a.attisdropped
			)
	LOOP
		EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', target.relname);
		EXECUTE format(
			'CREATE POLICY %I ON %I TO "matchiq_app" USING ("org_id" = current_setting(%L, true)) WITH CHECK ("org_id" = current_setting(%L, true))',
			target.relname || '_tenant_isolation', target.relname, 'app.org_id', 'app.org_id'
		);
		EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON %I TO "matchiq_app"', target.relname);
	END LOOP;
END
$$;--> statement-breakpoint
REVOKE UPDATE, DELETE ON "audit_events" FROM "matchiq_app";
