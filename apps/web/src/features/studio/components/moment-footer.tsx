import type { Insight } from '@matchiq/contracts';
import { EvidenceIcon } from '@/components/icons';
import { Button } from '@/components/ui';
import { CONFIDENCE_LABELS } from '@/constants/match';
import { STUDIO_COPY } from '@/constants/studio';
import { HowWritten } from '@/features/how-written/how-written';
import { NarrativeListen } from '@/features/listen/narrative-listen';
import { MomentNumbersChecked } from '@/features/numbers-checked/numbers-checked';
import type { InsightMark } from '../editorial/insight-marks';
import { SuppressInsightButton } from '../editorial/suppress-insight-button';
import { type NarrativeView, useMatchStore, useStudioUi } from '../store';

type MomentFooterProps = {
  insight: Insight;
  view: NarrativeView | null;
  mark: InsightMark;
  headline: string;
  onOpenEvidence: (insightId: string) => void;
};

export function MomentFooter({
  insight,
  view,
  mark,
  headline,
  onOpenEvidence,
}: MomentFooterProps) {
  const fixtureId = useMatchStore((s) => s.fixtureId);
  const persona = useStudioUi((s) => s.persona);
  return (
    <footer className="flex flex-wrap items-center gap-2">
      <span className="mr-auto text-micro text-ink-subtle">
        {CONFIDENCE_LABELS[insight.evidence.confidenceLabel]}
      </span>
      <MomentNumbersChecked
        insight={insight}
        narrative={view?.narrative ?? null}
        withheld={mark.retracted || mark.suppressed}
        persona={persona}
        headline={headline}
        onOpen={() => onOpenEvidence(insight.insightId)}
        className="order-last w-full"
      />
      {mark.suppressed || mark.published || mark.retracted ? null : (
        <SuppressInsightButton
          insightId={insight.insightId}
          headline={headline}
        />
      )}
      {view && !mark.retracted ? (
        <NarrativeListen narrative={view.narrative} />
      ) : null}
      <Button
        size="xs"
        variant="secondary"
        leadingIcon={<EvidenceIcon size={14} />}
        aria-label={STUDIO_COPY.insights.openEvidence(headline)}
        aria-haspopup="dialog"
        onClick={() => onOpenEvidence(insight.insightId)}
      >
        {STUDIO_COPY.insights.evidence}
      </Button>
      <HowWritten
        fixtureId={fixtureId}
        insightId={insight.insightId}
        moment={headline}
      />
    </footer>
  );
}
