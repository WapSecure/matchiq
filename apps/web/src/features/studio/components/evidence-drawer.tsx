'use client';

import { Drawer } from '@/components/ui/drawer';
import { EVIDENCE_COPY } from '@/constants/evidence';
import { INSIGHT_KIND_LABELS } from '@/constants/match';
import { useEvidenceEvents } from '../hooks/use-evidence-events';
import type { Roster } from '../lib/roster';
import {
  selectInsight,
  selectNarrative,
  useMatchStore,
  useMatchStoreShallow,
  useStudioUi,
} from '../store';
import {
  CounterEvidenceList,
  EvidenceEvents,
  EvidenceMetrics,
  EvidenceSection,
  EvidenceSummary,
} from './evidence-sections';
import { NarrativePanel } from './narrative-panel';

const NO_IDS: readonly string[] = [];

export function EvidenceDrawer({ roster }: { roster: Roster }) {
  const selectedId = useStudioUi((s) => s.selectedInsightId);
  const persona = useStudioUi((s) => s.persona);
  const locale = useStudioUi((s) => s.locale);
  const close = useStudioUi((s) => s.closeEvidence);
  const insight = useMatchStore((s) => selectInsight(s, selectedId));
  const view = useMatchStoreShallow((s) =>
    selectedId ? selectNarrative(s, selectedId, persona, locale) : null,
  );
  const ids = insight?.evidence.eventIds ?? NO_IDS;
  const fixtureId = useMatchStore((s) => s.fixtureId);
  const { events, resolving } = useEvidenceEvents(fixtureId, ids);
  const title =
    view?.narrative.headline ??
    (insight ? INSIGHT_KIND_LABELS[insight.kind] : EVIDENCE_COPY.title);

  return (
    <Drawer
      open={insight !== null}
      onClose={close}
      title={title}
      eyebrow={EVIDENCE_COPY.title}
      closeLabel={EVIDENCE_COPY.close}
    >
      {insight ? (
        <>
          <EvidenceSection title={EVIDENCE_COPY.sections.claim}>
            <NarrativePanel insight={insight} view={view} locale={locale} />
            {view ? (
              <p className="mt-2 text-xs leading-relaxed text-ink-subtle">
                {insight.evidence.rationale}
              </p>
            ) : null}
          </EvidenceSection>
          <EvidenceSection title={EVIDENCE_COPY.sections.window}>
            <EvidenceSummary insight={insight} />
          </EvidenceSection>
          <EvidenceSection title={EVIDENCE_COPY.sections.metrics}>
            <EvidenceMetrics evidence={insight.evidence} />
          </EvidenceSection>
          <EvidenceSection title={EVIDENCE_COPY.sections.events}>
            <EvidenceEvents
              ids={ids}
              events={events}
              roster={roster}
              resolving={resolving}
            />
          </EvidenceSection>
          <EvidenceSection title={EVIDENCE_COPY.sections.counter}>
            <CounterEvidenceList evidence={insight.evidence} />
          </EvidenceSection>
          <p className="pt-2 text-xs leading-relaxed text-ink-subtle">
            {EVIDENCE_COPY.caveat}
          </p>
        </>
      ) : null}
    </Drawer>
  );
}
