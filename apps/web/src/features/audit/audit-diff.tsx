import type { AuditEvent } from '@matchiq/contracts';
import { Disclosure } from '@/components/ui';
import { AUDIT_COPY } from '@/constants/audit';
import { diffStates } from './audit-query';

const show = (value: unknown): string => {
  if (value === undefined || value === null) return AUDIT_COPY.diffEmpty;
  if (typeof value === 'boolean')
    return value ? AUDIT_COPY.diffYes : AUDIT_COPY.diffNo;
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
};

/** `frozenAt` and `kill_switch` read as "Frozen at" and "Kill switch". */
const humanField = (field: string): string => {
  const words = field
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
};

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
      <table className="w-full border-collapse text-left text-micro">
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
                {humanField(c.field)}
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
