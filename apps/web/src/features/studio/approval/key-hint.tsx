import type { ReactNode } from 'react';

/** Small key cap for visible shortcut hints; hidden on touch screens. */
export function KeyHint({ children }: { children: ReactNode }) {
  return (
    <kbd
      aria-hidden
      className="inline-flex min-w-4 items-center justify-center rounded-[4px] border border-current/30 px-1 font-sans text-[10px] leading-4 font-semibold opacity-80 pointer-coarse:hidden"
    >
      {children}
    </kbd>
  );
}
