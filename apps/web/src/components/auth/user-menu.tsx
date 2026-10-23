'use client';

import { SignOutIcon, UserIcon } from '@/components/icons';
import {
  ActionButton,
  Button,
  ButtonLink,
  PopoverPanel,
  PopoverTrigger,
} from '@/components/ui';
import { AUTH_COPY, AUTH_ROUTES, ROLE_LABELS } from '@/constants/auth';
import { rolesOf, useSession } from '@/lib/auth/session-store';
import type { SessionViewUser } from '@/lib/auth/session-view';

const roleText = (roles: readonly string[]): string =>
  roles.map((r) => ROLE_LABELS[r as keyof typeof ROLE_LABELS] ?? r).join(', ');

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="eyebrow text-ink-subtle">{label}</dt>
      <dd className="break-words text-sm text-ink [overflow-wrap:anywhere]">
        {value}
      </dd>
    </div>
  );
}

function AccountDetails({ user }: { user: SessionViewUser }) {
  return (
    <>
      <dl className="space-y-3">
        <Detail label={AUTH_COPY.signedInAs} value={user.name} />
        <Detail
          label={AUTH_COPY.organisation}
          value={user.orgName?.trim() || AUTH_COPY.organisationUnavailable}
        />
        <Detail label={AUTH_COPY.role} value={roleText(user.roles)} />
      </dl>
      <form method="post" action={AUTH_ROUTES.signOut} className="mt-4">
        <Button
          type="submit"
          className="w-full"
          leadingIcon={<SignOutIcon size={15} />}
        >
          {AUTH_COPY.signOut}
        </Button>
      </form>
    </>
  );
}

/** Name, organisation and role of the signed-in user, or a sign-in link. */
export function UserMenu() {
  const view = useSession((s) => s.view);
  if (view?.status !== 'authenticated') {
    if (!view?.ssoEnabled) return null;
    return (
      <ButtonLink
        href={AUTH_ROUTES.signInPage}
        variant="secondary"
        size="sm"
        aria-label={AUTH_COPY.signIn}
        leadingIcon={<UserIcon size={15} />}
        className="px-2 md:px-3"
      >
        <span className="hidden md:inline">{AUTH_COPY.signIn}</span>
      </ButtonLink>
    );
  }
  return (
    <PopoverTrigger>
      <ActionButton
        variant="ghost"
        aria-label={`${AUTH_COPY.userMenu}: ${view.user.name}, ${roleText(rolesOf(view))}`}
        leadingIcon={<UserIcon size={16} />}
      >
        <span className="hidden max-w-32 truncate md:inline">
          {view.user.name}
        </span>
      </ActionButton>
      <PopoverPanel
        aria-label={AUTH_COPY.userMenu}
        placement="bottom end"
        className="w-64"
      >
        <AccountDetails user={view.user} />
      </PopoverPanel>
    </PopoverTrigger>
  );
}
