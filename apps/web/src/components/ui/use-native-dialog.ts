'use client';

import { type RefObject, useEffect, useRef } from 'react';

/**
 * Opens a native `<dialog>` modally while `open` is true: the browser supplies
 * the focus trap, inert background and Escape handling. Focus returns to the
 * opener on close, including when the dialog unmounts while open.
 */
export const useNativeDialog = (
  open: boolean,
): RefObject<HTMLDialogElement | null> => {
  const ref = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      opener.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
    } else if (!open && dialog.open) {
      if (typeof dialog.close === 'function') dialog.close();
      else dialog.removeAttribute('open');
      opener.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    const restore = opener;
    return () => {
      if (restore.current?.isConnected) restore.current.focus();
    };
  }, []);

  return ref;
};
