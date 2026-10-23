import { UserIcon } from '@/components/icons';
import { Badge } from '@/components/ui';
import {
  AUTH_COPY,
  AUTH_QUERY,
  AUTH_ROUTES,
  DEMO_ACCOUNTS,
  DEMO_PASSWORD,
  ROLE_LABELS,
} from '@/constants/auth';

const signInHref = (username: string, returnTo: string) =>
  `${AUTH_ROUTES.signIn}?${new URLSearchParams({
    [AUTH_QUERY.loginHint]: username,
    [AUTH_QUERY.returnTo]: returnTo,
  }).toString()}`;

/**
 * Seeded local accounts (ADR-0018). Each link starts the normal OIDC flow
 * with `login_hint`; the password is shown, never submitted for the user.
 */
export function DemoAccounts({ returnTo }: { returnTo: string }) {
  return (
    <section
      aria-labelledby="demo-accounts-title"
      className="rounded-lg border border-dashed border-synthetic/40 bg-synthetic-soft/40 p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-center gap-2">
        <h2 id="demo-accounts-title" className="text-sm font-semibold text-ink">
          {AUTH_COPY.demoTitle}
        </h2>
        <Badge tone="synthetic">{AUTH_COPY.demoBadge}</Badge>
      </div>
      <p className="mt-2 text-sm text-ink-muted">
        {AUTH_COPY.demoLead(DEMO_PASSWORD)}
      </p>
      <ul className="mt-4 grid gap-2">
        {DEMO_ACCOUNTS.map((account) => (
          <li key={account.username}>
            <a
              href={signInHref(account.username, returnTo)}
              className="press flex min-h-11 items-center gap-3 rounded-md border border-line bg-surface px-3 py-2 outline-none hover:border-control hover:bg-surface-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <UserIcon size={16} className="shrink-0 text-ink-muted" />
              <span className="min-w-0">
                <span className="block text-[13px] font-medium text-ink">
                  {AUTH_COPY.demoAccount(
                    ROLE_LABELS[account.role],
                    account.org,
                  )}
                </span>
                <span className="block truncate font-mono text-micro text-ink-subtle">
                  {account.username}
                </span>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
