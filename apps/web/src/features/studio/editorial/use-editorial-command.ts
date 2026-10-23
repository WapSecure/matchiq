'use client';

import { useMutation } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import type { CommandInput } from '@/lib/api/editorial-endpoints';
import {
  editorialProblem,
  type ProblemView,
} from '@/lib/api/describe-editorial-problem';
import { useEditorialNotice } from './notice-store';

type Result = { changed: boolean };

type Options<T extends Result> = {
  run: (input: CommandInput) => Promise<T>;
  /** Applies the confirmed result to the store before the stream echoes it. */
  apply?: (result: T) => void;
  copy: { done: string; noop: string };
};

export type EditorialCommand = {
  open: boolean;
  start: () => void;
  close: () => void;
  submit: (reason: string) => void;
  pending: boolean;
  problem: ProblemView | null;
};

/**
 * Dialog state and mutation for one producer command. A retry of the same
 * reason reuses its `Idempotency-Key`, so a lost response is never applied
 * twice; a new reason is a new command and gets a new key.
 */
export const useEditorialCommand = <T extends Result>({
  run,
  apply,
  copy,
}: Options<T>): EditorialCommand => {
  const [open, setOpen] = useState(false);
  const attempt = useRef<{ reason: string; key: string } | null>(null);
  const show = useEditorialNotice((s) => s.show);
  const mutation = useMutation({
    mutationFn: run,
    onSuccess: (result) => {
      apply?.(result);
      show(result.changed ? copy.done : copy.noop, result.changed);
      setOpen(false);
    },
  });

  return {
    open,
    start: () => {
      attempt.current = null;
      mutation.reset();
      setOpen(true);
    },
    close: () => {
      if (!mutation.isPending) setOpen(false);
    },
    submit: (raw) => {
      const reason = raw.trim();
      const key =
        attempt.current?.reason === reason
          ? attempt.current.key
          : crypto.randomUUID();
      attempt.current = { reason, key };
      mutation.mutate({ reason, idempotencyKey: key });
    },
    pending: mutation.isPending,
    problem: mutation.isError ? editorialProblem(mutation.error) : null,
  };
};
