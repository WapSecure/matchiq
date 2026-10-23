import type { GateReport } from '@/lib/api/trace-schemas';
import { OBSERVATORY_COPY } from '@/constants/observatory';
import { withUniqueKeys } from '@/lib/unique-keys';

const copy = OBSERVATORY_COPY.technical;

function Rejections({ report }: { report: GateReport }) {
  if (report.rejected.length === 0)
    return <p className="text-xs text-ink-subtle">{copy.noRejections}</p>;
  return (
    <ul className="flex flex-col gap-1.5">
      {report.rejected.map((r, i) => (
        <li
          key={`${r.item}-${r.persona ?? ''}-${r.locale ?? ''}-${i}`}
          className="rounded-md border border-warning/30 bg-warning/5 p-2 text-xs"
        >
          <p className="flex flex-wrap items-center gap-1.5 text-ink">
            <span className="font-medium">{r.item}</span>
            {r.persona ? (
              <span className="text-ink-muted">{r.persona}</span>
            ) : null}
            {r.locale ? (
              <span className="font-mono text-ink-muted">{r.locale}</span>
            ) : null}
            {withUniqueKeys(r.codes, String).map(({ item: code, key }) => (
              <code
                key={key}
                className="rounded-sm border border-warning/40 px-1 font-mono text-micro text-warning"
              >
                {code}
              </code>
            ))}
          </p>
          {withUniqueKeys(r.details, String).map(({ item: d, key }) => (
            <p key={key} className="mt-0.5 text-ink-muted">
              {d}
            </p>
          ))}
        </li>
      ))}
    </ul>
  );
}

/** Raw publish-gate verdict with issue codes, for Technical details. */
export function GateReportView({ report }: { report: GateReport | null }) {
  if (!report)
    return <p className="text-xs text-ink-subtle">{copy.gatePending}</p>;
  return (
    <div className="flex flex-col gap-2">
      <p className="tabular flex flex-wrap gap-x-3 text-xs text-ink">
        <span>{copy.published(report.publishedNarratives)}</span>
        <span className="text-ink-muted">
          {copy.templates(report.templateNarratives)}
        </span>
        <span className="text-ink-muted">
          {copy.overlayRevision(report.overlayRevision)}
        </span>
      </p>
      <h4 className="eyebrow">{copy.rejected}</h4>
      <Rejections report={report} />
    </div>
  );
}
