import { MAIN_CONTENT_ID, SKIP_LINK_LABEL } from '@/constants/site';

export function SkipLink() {
  return (
    <a
      href={`#${MAIN_CONTENT_ID}`}
      className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-accent focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-accent-ink"
    >
      {SKIP_LINK_LABEL}
    </a>
  );
}
