import type {
  Fixture,
  Insight,
  MatchEvent,
  OverlayProposal,
  ReplayStatus,
} from '@matchiq/contracts';
import {
  applyEvent,
  createInitialState,
  createMomentCursor,
  stepMoments,
  toSnapshot,
  type MomentCursor,
  type ProjectionState,
} from '@matchiq/football-engine';
import {
  FALLBACK_REASONS,
  INSIGHT_REVISION,
  OVERLAY_END_REASONS,
} from '../constants';
import { toOverlayCue } from './artifacts';
import { gateOverlay } from './gate/publish-gate';
import {
  OverlayScheduler,
  type ClockPoint,
  type OverlayAction,
} from './overlay-scheduler';
import {
  appendPublication,
  streamDraft,
  type PipelineBatch,
} from './pipeline-batch';
import {
  gateContextOf,
  templatePublication,
  type Publication,
} from './publication';
import { SnapshotCadence } from './snapshot-cadence';
import { templateOverlay } from './templates/template-narratives';

export interface MatchPipelineOptions {
  readonly fixture: Fixture;
  readonly aiEnabled: boolean;
  /** Wall clock for `emittedAt`/`createdAt` only; never drives a decision. */
  readonly now: () => string;
}

/**
 * The per-session intelligence pipeline as a deterministic state machine:
 * project each event, emit snapshots on cadence, detect key moments, schedule
 * overlays and (with AI disabled) publish template narratives. It performs no
 * I/O; callers write each batch in one transaction. Replaying the same events
 * into a fresh instance rebuilds identical state, which is how a restarted
 * worker resumes a session.
 */
export class MatchPipeline {
  private projection: ProjectionState;
  private cursor: MomentCursor = createMomentCursor();
  private readonly cadence = new SnapshotCadence();
  private readonly scheduler = new OverlayScheduler();
  private clock: ClockPoint = { period: 1, clockMs: 0 };

  constructor(private readonly options: MatchPipelineOptions) {
    this.projection = createInitialState(options.fixture);
  }

  get fixtureId(): string {
    return this.options.fixture.fixtureId;
  }

  step(event: MatchEvent, batch: PipelineBatch): void {
    batch.events.push(event);
    batch.drafts.push(this.draft('match.event', event));
    this.projection = applyEvent(this.projection, event);
    const moments = stepMoments(this.cursor, event, this.projection.fixture);
    this.cursor = moments.cursor;
    this.clock = { period: event.period, clockMs: event.matchClockMs };
    this.applyOverlays(this.scheduler.advance(this.clock), event, batch);
    if (this.cadence.shouldSnapshot(event)) {
      const snapshot = toSnapshot(this.projection);
      batch.drafts.push(this.draft('match.snapshot', snapshot));
      batch.snapshot = snapshot;
    }
    for (const insight of moments.insights) this.detect(insight, event, batch);
    if (event.type === 'PERIOD_ENDED' || event.type === 'MATCH_ENDED') {
      const reason =
        event.type === 'MATCH_ENDED'
          ? OVERLAY_END_REASONS.matchEnded
          : OVERLAY_END_REASONS.periodEnded;
      this.applyOverlays(this.scheduler.flush(reason), event, batch);
    }
    if (event.type === 'MATCH_ENDED') batch.matchEnded = true;
  }

  status(status: ReplayStatus, batch: PipelineBatch): void {
    batch.drafts.push(this.draft('replay.status', status));
    batch.status = status;
  }

  /** Writes a gated publication (agents result or failure fallback) into the batch. */
  publish(
    insight: Insight,
    publication: Publication,
    batch: PipelineBatch,
  ): void {
    appendPublication(
      {
        fixtureId: this.fixtureId,
        insight,
        publication,
        now: this.options.now,
      },
      batch,
    );
    if (publication.overlay !== null)
      this.reviseOverlay(insight, publication.overlay, batch);
  }

  private detect(
    insight: Insight,
    event: MatchEvent,
    batch: PipelineBatch,
  ): void {
    const { fixture, aiEnabled } = this.options;
    batch.drafts.push(this.draft('insight.detected', insight));
    batch.insights.push({
      insight,
      revision: INSIGHT_REVISION,
      period: event.period,
      detectedSequence: event.sequence,
      publication: aiEnabled ? 'PENDING' : 'TEMPLATE',
    });
    const proposal = gateOverlay(
      templateOverlay(insight, fixture),
      gateContextOf(insight, fixture),
    );
    if (proposal.ok) {
      const cue = toOverlayCue(insight, proposal.value, 1);
      this.applyOverlays(this.scheduler.offer(cue, this.clock), event, batch);
    }
    // With AI enabled the narratives come from the agents job enqueued after commit.
    if (aiEnabled) return;
    const publication = templatePublication({
      insight,
      fixture,
      createdAt: this.options.now(),
      reason: FALLBACK_REASONS.aiDisabled,
    });
    this.publish(insight, publication, batch);
  }

  private reviseOverlay(
    insight: Insight,
    proposal: OverlayProposal,
    batch: PipelineBatch,
  ): void {
    const { cue: revised, commit } = this.scheduler.revise(insight.insightId, {
      headline: proposal.headline,
      body: proposal.body,
      evidenceEventIds: [...proposal.evidenceEventIds],
      metricRefs: [...proposal.metricRefs],
    });
    batch.afterCommit.push(commit);
    if (revised === null) return;
    batch.drafts.push(this.draft('overlay.publish', revised));
    batch.overlays.push({
      cue: revised,
      status: 'LIVE',
      period: this.clock.period,
      publishedSequence: this.projection.ledger.at(-1)?.sequence ?? -1,
    });
  }

  private applyOverlays(
    actions: readonly OverlayAction[],
    event: MatchEvent,
    batch: PipelineBatch,
  ): void {
    for (const action of actions) {
      if (action.kind === 'publish') {
        batch.drafts.push(this.draft('overlay.publish', action.cue));
        batch.overlays.push({
          cue: action.cue,
          status: 'LIVE',
          period: action.period,
          publishedSequence: event.sequence,
        });
      } else if (action.kind === 'end') {
        batch.drafts.push(
          this.draft('overlay.retract', {
            overlayId: action.cue.overlayId,
            revision: action.cue.revision,
            reason: action.reason,
          }),
        );
        batch.overlayEnds.push({
          overlayId: action.cue.overlayId,
          status: action.status,
          reason: action.reason,
        });
      }
    }
  }

  private draft<T extends Parameters<typeof streamDraft>[2]>(
    type: T,
    payload: Parameters<typeof streamDraft<T>>[3],
  ) {
    return streamDraft(this.fixtureId, this.options.now(), type, payload);
  }
}
