'use client';

import type { AuditEvent } from '@matchiq/contracts';
import { TARGET_TYPE_LABELS } from '@/constants/audit';
import { MATCH_CODE_COPY } from '@/constants/match-code';
import { useMatchLabel } from '@/lib/use-match-label';

const ID_CLASS = 'block break-all font-mono text-micro text-ink-subtle';

/** A replay shown as its match code and replay number instead of its raw id. */
function SessionTarget({ id }: { id: string }) {
  const { code, replay } = useMatchLabel(id);
  if (!code) return <span className={ID_CLASS}>{id}</span>;
  return (
    <span className="tabular block font-mono text-micro text-ink-subtle">
      {code}
      {replay ? ` · ${MATCH_CODE_COPY.replay(replay)}` : ''}
    </span>
  );
}

export function AuditTargetCell({ target }: { target: AuditEvent['target'] }) {
  return (
    <>
      <span className="block text-ink">{TARGET_TYPE_LABELS[target.type]}</span>
      {target.type === 'fixture' ? (
        <SessionTarget id={target.id} />
      ) : (
        <span className={ID_CLASS}>{target.id}</span>
      )}
    </>
  );
}
