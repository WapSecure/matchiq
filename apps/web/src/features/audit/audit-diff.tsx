import type { AuditEvent } from '@matchiq/contracts';
import { Disclosure } from '@/components/ui';
import { AUDIT_COPY } from '@/constants/audit';
import { diffStates } from './audit-query';

const show = (value: unknown): string =>
  value === undefined ? AUDIT_COPY.diffEmpty : JSON.stringify(value);

/** Before/after per changed field, disclosed on demand to keep rows compact. */
export function AuditDiff({ event }: { event: AuditEvent }) {
  const changes = diffStates(event.before, event.after);
  if (changes.length === 0) {
    return <span className="text-ink-subtle">{AUDIT_COPY.noChanges}</span>;
  }
  return (
    <Disclosure
      title={
        <span className="text-accent-strong">
          {AUDIT_COPY.viewChanges(changes.length)}
        </span>
      }
      panelClassName="pt-1"
    >
      <table className="w-full border-collapse text-left font-mono text-micro">
        <thead>
          <tr className="text-ink-subtle">
            <th scope="col" className="pr-3 font-medium">
              {AUDIT_COPY.diffField}
            </th>
            <th scope="col" className="pr-3 font-medium">
              {AUDIT_COPY.diffBefore}
            </th>
            <th scope="col" className="font-medium">
              {AUDIT_COPY.diffAfter}
            </th>
          </tr>
        </thead>
        <tbody>
          {changes.map((c) => (
            <tr key={c.field}>
              <th scope="row" className="pr-3 font-normal text-ink-muted">
                {c.field}
              </th>
              <td className="pr-3 text-critical line-through decoration-critical/50">
                {show(c.before)}
              </td>
              <td className="text-positive">{show(c.after)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Disclosure>
  );
}
