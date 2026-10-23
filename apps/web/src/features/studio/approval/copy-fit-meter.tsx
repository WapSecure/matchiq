import type { OverlayCue } from '@matchiq/contracts';
import { Badge, type BadgeTone } from '@/components/ui';
import { COPY_FIT } from '@/constants/approval';
import { copyFitOf, type FieldFit, type FitLevel } from './copy-fit';

const TONE: Record<FitLevel, BadgeTone> = {
  fits: 'positive',
  tight: 'warning',
  over: 'critical',
};

function FieldLine({ label, fit }: { label: string; fit: FieldFit }) {
  return (
    <li className="flex items-center justify-between gap-3">
      <span>{label}</span>
      <span className={fit.level === 'over' ? 'text-critical' : undefined}>
        {COPY_FIT.count(fit.length, fit.max)}
      </span>
    </li>
  );
}

/** Copy-fit indicator: whether the wording fits the on-air graphic. */
export function CopyFitMeter({
  cue,
}: {
  cue: Pick<OverlayCue, 'headline' | 'body'>;
}) {
  const fit = copyFitOf(cue);
  return (
    <div className="flex flex-col gap-1.5" data-testid="copy-fit">
      <Badge tone={TONE[fit.level]} dot className="self-start">
        {COPY_FIT.labels[fit.level]}
      </Badge>
      <ul className="text-micro text-ink-subtle">
        <FieldLine label={COPY_FIT.headline} fit={fit.headline} />
        {fit.body.length > 0 ? (
          <FieldLine label={COPY_FIT.body} fit={fit.body} />
        ) : null}
      </ul>
    </div>
  );
}
