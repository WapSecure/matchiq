'use client';

import { SignOutIcon, UserIcon } from '@/components/icons';
import {
  ActionButton,
  Button,
  ButtonLink,
  PopoverPanel,
  PopoverTrigger,
} from '@/components/ui';
import { AUTH_ROUTES, ROLE_LABELS } from '@/constants/auth';
import { useInterfaceMessages } from '@/features/interface-language/interface-language-store';
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
  const messages = useInterfaceMessages();
  return (
    <>
      <dl className="space-y-3">
        <Detail label={messages.account.signedInAs} value={user.name} />
        <Detail
          label={messages.account.organisation}
          value={
            user.orgName?.trim() || messages.account.organisationUnavailable
          }
        />
        <Detail label={messages.account.role} value={roleText(user.roles)} />
      </dl>
      <form method="post" action={AUTH_ROUTES.signOut} className="mt-4">
        <Button
          type="submit"
          className="w-full"
          leadingIcon={<SignOutIcon size={15} />}
        >
          {messages.account.signOut}
        </Button>
      </form>
    </>
  );
}

/** Name, organisation and role of the signed-in user, or a sign-in link. */
export function UserMenu() {
  const messages = useInterfaceMessages();
  const view = useSession((s) => s.view);
  if (view?.status !== 'authenticated') {
    if (!view?.ssoEnabled) return null;
    return (
      <ButtonLink
        href={AUTH_ROUTES.signInPage}
        variant="secondary"
        size="sm"
        aria-label={messages.account.signIn}
        leadingIcon={<UserIcon size={15} />}
        className="px-2 md:px-3"
      >
        <span className="hidden md:inline">{messages.account.signIn}</span>
      </ButtonLink>
    );
  }
  return (
    <PopoverTrigger>
      <ActionButton
        variant="ghost"
        aria-label={`${messages.account.menu}: ${view.user.name}, ${roleText(rolesOf(view))}`}
        leadingIcon={<UserIcon size={16} />}
      >
        <span className="hidden max-w-32 truncate md:inline">
          {view.user.name}
        </span>
      </ActionButton>
      <PopoverPanel
        aria-label={messages.account.menu}
        placement="bottom end"
        className="w-64"
      >
        <AccountDetails user={view.user} />
      </PopoverPanel>
    </PopoverTrigger>
  );
}
