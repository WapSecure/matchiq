'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { SignOutIcon, UserIcon } from '@/components/icons';
import { Button, ButtonLink } from '@/components/ui';
import { AUTH_COPY, AUTH_ROUTES, ROLE_LABELS } from '@/constants/auth';
import { rolesOf, useSession } from '@/lib/auth/session-store';
import type { SessionViewUser } from '@/lib/auth/session-view';

const roleText = (roles: readonly string[]): string =>
  roles.map((r) => ROLE_LABELS[r as keyof typeof ROLE_LABELS] ?? r).join(', ');

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="eyebrow text-ink-subtle">{label}</dt>
      <dd className="text-sm text-ink">{value}</dd>
    </div>
  );
}

function MenuPanel({ id, user }: { id: string; user: SessionViewUser }) {
  return (
    <div
      id={id}
      className="absolute right-0 top-full z-50 mt-2 w-64 rounded-lg border border-line bg-surface p-4 shadow-float"
    >
      <dl className="space-y-3">
        <Detail label={AUTH_COPY.signedInAs} value={user.name} />
        <Detail
          label={AUTH_COPY.organisation}
          value={user.orgName ?? user.orgId}
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
    </div>
  );
}

/** Name, organisation and role of the signed-in user, or a sign-in link. */
export function UserMenu() {
  const view = useSession((s) => s.view);
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    const onClick = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, [open]);

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
    <div ref={root} className="relative">
      <Button
        variant="ghost"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={`${AUTH_COPY.userMenu}: ${view.user.name}, ${roleText(rolesOf(view))}`}
        onClick={() => setOpen((o) => !o)}
        leadingIcon={<UserIcon size={16} />}
      >
        <span className="hidden max-w-32 truncate md:inline">
          {view.user.name}
        </span>
      </Button>
      {open ? <MenuPanel id={panelId} user={view.user} /> : null}
    </div>
  );
}
