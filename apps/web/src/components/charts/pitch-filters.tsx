import { SegmentedControl } from '@/components/ui/segmented-control';
import {
  PITCH_COPY,
  PITCH_KINDS,
  type PitchKind,
  type PitchTeamFilter,
} from '@/constants/pitch';
import { cn } from '@/lib/cn';
import { GlyphSwatch } from './pitch-glyph';

type PitchFiltersProps = {
  team: PitchTeamFilter;
  onTeam: (team: PitchTeamFilter) => void;
  kinds: ReadonlySet<PitchKind>;
  onToggleKind: (kind: PitchKind) => void;
  counts: Record<PitchKind, number>;
  homeShort: string;
  awayShort: string;
};

/** One row above the plot: team scope, then event types as toggle chips. */
export function PitchFilters({
  team,
  onTeam,
  kinds,
  onToggleKind,
  counts,
  homeShort,
  awayShort,
}: PitchFiltersProps) {
  const sideOf = team === 'away' ? 'away' : 'home';
  return (
    <div className="flex flex-wrap items-end gap-x-4 gap-y-3 @3xl:flex-col @3xl:items-stretch @3xl:gap-5">
      <SegmentedControl<PitchTeamFilter>
        legend={PITCH_COPY.teamLegend}
        options={[
          { value: 'all', label: PITCH_COPY.allTeams },
          { value: 'home', label: homeShort },
          { value: 'away', label: awayShort },
        ]}
        value={team}
        onChange={onTeam}
      />
      <fieldset className="min-w-0">
        <legend className="eyebrow mb-1.5">{PITCH_COPY.kindLegend}</legend>
        <div className="flex flex-wrap gap-1.5 @3xl:flex-col">
          {PITCH_KINDS.map((kind) => {
            const on = kinds.has(kind);
            return (
              <label
                key={kind}
                className={cn(
                  'press flex h-7 cursor-pointer items-center gap-1.5 rounded-md border px-2 text-xs font-medium',
                  'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-1 has-[:focus-visible]:outline-accent',
                  on
                    ? 'border-line-strong bg-selected text-ink shadow-panel'
                    : 'border-dashed border-line-strong text-ink-subtle hover:text-ink',
                )}
              >
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => onToggleKind(kind)}
                  className="sr-only"
                />
                <GlyphSwatch kind={kind} side={sideOf} />
                {PITCH_COPY.kinds[kind]}
                <span className="tabular font-mono text-micro text-ink-subtle">
                  {counts[kind]}
                </span>
              </label>
            );
          })}
        </div>
        <p className="mt-2 text-micro text-ink-subtle">
          {PITCH_COPY.offTarget}
        </p>
      </fieldset>
    </div>
  );
}
