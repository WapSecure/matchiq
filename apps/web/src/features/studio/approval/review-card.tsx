'use client';

import type { OverlayReview } from '@matchiq/contracts';
import { useEffect, useState, type KeyboardEvent } from 'react';
import { InlineProblem } from '@/components/feedback/inline-problem';
import { AlertIcon, ClockIcon } from '@/components/icons';
import { OverlayCanvas } from '@/components/overlay/overlay-canvas';
import { Badge } from '@/components/ui';
import { APPROVAL_COPY } from '@/constants/approval';
import {
  SHORTCUTS_COPY,
  type SettledOutcome,
} from '@/constants/approval-shortcuts';
import { STUDIO_COPY, WATERMARK } from '@/constants/studio';
import { cn } from '@/lib/cn';
import { CopyFitMeter } from './copy-fit-meter';
import {
  DEFAULT_ADJUSTMENTS,
  overridesOf,
  ReviewAdjust,
  type Adjustments,
} from './review-adjust';
import { ReviewActions } from './review-actions';
import { focusSibling, shortcutFor } from './shortcut-keys';
import { useSecondsLeft } from './use-seconds-left';
import { useReviewDecision } from './use-review-decision';

function Preview({ review }: { review: OverlayReview }) {
  return (
    <OverlayCanvas
      cues={[review.cue]}
      scorebug={null}
      watermark={WATERMARK}
      standbyLabel={APPROVAL_COPY.title}
      safeAreaLabel={STUDIO_COPY.overlay.safeArea}
      frameLabel={APPROVAL_COPY.previewLabel(review.cue.headline)}
      className="w-full sm:w-56 sm:shrink-0"
    />
  );
}

function Meta({
  review,
  left,
}: {
  review: OverlayReview;
  left: number | null;
}) {
  const urgent = left !== null && left <= APPROVAL_COPY.urgentSeconds;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {left === null ? null : (
        <Badge
          tone={urgent ? 'critical' : 'warning'}
          data-testid="approval-countdown"
        >
          {urgent ? <AlertIcon size={12} /> : <ClockIcon size={12} />}
          {APPROVAL_COPY.sendWithin(left)}
        </Badge>
      )}
      {review.revision > 1 ? <Badge>{APPROVAL_COPY.updated}</Badge> : null}
    </div>
  );
}

type Props = {
  review: OverlayReview;
  offsetMs: number;
  shortcuts: boolean;
  onSettle: (review: OverlayReview, outcome: SettledOutcome) => void;
};

/** One waiting cue: preview, copy fit, adjustments and the decision. */
export function ReviewCard({ review, offsetMs, shortcuts, onSettle }: Props) {
  const [adjust, setAdjust] = useState<Adjustments>(DEFAULT_ADJUSTMENTS);
  const left = useSecondsLeft(review.approvalDeadline, offsetMs);
  const decision = useReviewDecision(review.insightId, (outcome) =>
    onSettle(review, outcome),
  );
  const busy = decision.pending !== null || decision.disabled;
  const { headline } = review.cue;
  const lapsed = left === 0 && decision.pending === null;
  useEffect(() => {
    if (lapsed) onSettle(review, 'LAPSED');
  }, [lapsed, onSettle, review]);

  const approve = () =>
    busy ||
    decision.decide({
      decision: 'APPROVE',
      revision: review.revision,
      ...overridesOf(adjust),
    });
  const reject = () =>
    busy || decision.decide({ decision: 'REJECT', revision: review.revision });
  const onKeyDown = (event: KeyboardEvent<HTMLLIElement>) => {
    const action = shortcutFor(event, shortcuts);
    if (action === null || action === 'help') return;
    event.preventDefault();
    if (action === 'approve') approve();
    else if (action === 'reject') reject();
    else focusSibling(event.currentTarget, action === 'next' ? 1 : -1);
  };

  return (
    <li
      data-review-item
      tabIndex={0}
      aria-label={SHORTCUTS_COPY.itemLabel(headline)}
      onKeyDown={onKeyDown}
      className={cn(
        'flex flex-col gap-3 rounded-lg border bg-surface-raised p-3 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:flex-row',
        left !== null && left <= APPROVAL_COPY.urgentSeconds
          ? 'border-critical/50'
          : 'border-line',
      )}
    >
      <Preview review={review} />
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <Meta review={review} left={left} />
        <CopyFitMeter cue={review.cue} />
        <ReviewAdjust value={adjust} onChange={setAdjust} disabled={busy} />
        {decision.error ? (
          <InlineProblem
            error={decision.error}
            message={decision.message ?? undefined}
          />
        ) : null}
        <ReviewActions
          headline={headline}
          busy={busy}
          pending={decision.pending}
          shortcuts={shortcuts}
          onApprove={approve}
          onReject={reject}
        />
      </div>
    </li>
  );
}
