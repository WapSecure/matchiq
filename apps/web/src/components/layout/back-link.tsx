'use client';

import type { MouseEvent } from 'react';
import { ArrowLeftIcon } from '@/components/icons';
import { ButtonLink } from '@/components/ui';
import { BACK_LINK, ROUTES } from '@/constants/navigation';
import { cn } from '@/lib/cn';

type BackLinkProps = { fallbackHref?: string; className?: string };

const cameFromThisSite = () => {
  try {
    return new URL(document.referrer).origin === window.location.origin;
  } catch {
    return false;
  }
};

/**
 * Returns to the previous page when it was on this site, otherwise to
 * `fallbackHref`. A plain link without JavaScript.
 */
export function BackLink({
  fallbackHref = ROUTES.home,
  className,
}: BackLinkProps) {
  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0)
      return;
    if (window.history.length > 1 && cameFromThisSite()) {
      event.preventDefault();
      window.history.back();
    }
  };
  return (
    <ButtonLink
      href={fallbackHref}
      onClick={onClick}
      variant="ghost"
      size="sm"
      data-testid="back-link"
      className={cn('-ml-3', className)}
      leadingIcon={<ArrowLeftIcon size={16} />}
    >
      {BACK_LINK.label}
    </ButtonLink>
  );
}
