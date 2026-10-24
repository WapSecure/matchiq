'use client';

import type { OverlayReview } from '@matchiq/contracts';
import { useState } from 'react';
import { InlineProblem } from '@/components/feedback/inline-problem';
import { CheckIcon, ClockIcon, CloseIcon } from '@/components/icons';
import { OverlayCanvas } from '@/components/overlay/overlay-canvas';
import { Badge, Button } from '@/components/ui';
import { APPROVAL_COPY } from '@/constants/approval';
import { STUDIO_COPY, WATERMARK } from '@/constants/studio';
import { formatClock } from '@/lib/format';
import { CopyFitMeter } from './copy-fit-meter';
import {
  DEFAULT_ADJUSTMENTS,
  overridesOf,
  ReviewAdjust,
  type Adjustments,
} from './review-adjust';
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

function Meta({ review }: { review: OverlayReview }) {
  const closes = formatClock(review.period, review.expiresAtClockMs);
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Badge tone="warning" dot>
        <ClockIcon size={12} />
        {APPROVAL_COPY.closes(closes)}
      </Badge>
      {review.revision > 1 ? <Badge>{APPROVAL_COPY.updated}</Badge> : null}
    </div>
  );
}

/** One waiting cue: preview, copy fit, adjustments and the decision. */
export function ReviewCard({ review }: { review: OverlayReview }) {
  const [adjust, setAdjust] = useState<Adjustments>(DEFAULT_ADJUSTMENTS);
  const decision = useReviewDecision(review.insightId);
  const busy = decision.pending !== null || decision.disabled;
  const { headline } = review.cue;
  return (
    <li className="flex flex-col gap-3 rounded-lg border border-line bg-surface-raised p-3 sm:flex-row">
      <Preview review={review} />
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <Meta review={review} />
        <CopyFitMeter cue={review.cue} />
        <ReviewAdjust value={adjust} onChange={setAdjust} disabled={busy} />
        {decision.error ? (
          <InlineProblem
            error={decision.error}
            message={decision.message ?? undefined}
          />
        ) : null}
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            aria-label={APPROVAL_COPY.rejectLabel(headline)}
            aria-disabled={busy || undefined}
            leadingIcon={<CloseIcon size={14} />}
            onClick={() =>
              busy ||
              decision.decide({ decision: 'REJECT', revision: review.revision })
            }
          >
            {decision.pending === 'REJECT'
              ? APPROVAL_COPY.rejecting
              : APPROVAL_COPY.reject}
          </Button>
          <Button
            size="sm"
            aria-label={APPROVAL_COPY.approveLabel(headline)}
            aria-disabled={busy || undefined}
            leadingIcon={<CheckIcon size={14} />}
            onClick={() =>
              busy ||
              decision.decide({
                decision: 'APPROVE',
                revision: review.revision,
                ...overridesOf(adjust),
              })
            }
          >
            {decision.pending === 'APPROVE'
              ? APPROVAL_COPY.approving
              : APPROVAL_COPY.approve}
          </Button>
        </div>
      </div>
    </li>
  );
}
