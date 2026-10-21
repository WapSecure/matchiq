import {
  DeterministicIcon,
  EvidenceIcon,
  ExplainIcon,
  IngestIcon,
  InterpretIcon,
  PersonalizeIcon,
  RenderIcon,
  ResilienceIcon,
} from '@/components/icons';

export const HERO = {
  eyebrow: 'Broadcast intelligence platform',
  title: 'One trusted event stream. Every audience, every language.',
  description:
    'MatchIQ turns match events into verified insight in seconds — a deterministic football engine detects what changed, coordinated AI agents explain why it matters, and producers receive timed, evidence-linked overlays.',
  primaryCta: { label: 'How it works', href: '#pipeline' },
  secondaryCta: { label: 'View source' },
} as const;

export const PIPELINE = {
  id: 'pipeline',
  eyebrow: 'Event-to-audience pipeline',
  title: 'Five stages, one source of truth',
  description:
    'Every stage consumes typed, versioned contracts. Facts are computed once and never re-derived by a model.',
  stages: [
    {
      key: 'ingest',
      title: 'Ingest',
      description:
        'Schema-validated, idempotent event ledger with strict sequencing and provenance.',
      Icon: IngestIcon,
    },
    {
      key: 'interpret',
      title: 'Interpret',
      description:
        'Deterministic match state, rolling metrics and versioned evidence windows.',
      Icon: InterpretIcon,
    },
    {
      key: 'explain',
      title: 'Explain',
      description:
        'Analyst, writer and fact-checker agents produce claims bound to source events.',
      Icon: ExplainIcon,
    },
    {
      key: 'render',
      title: 'Render',
      description:
        'Timed overlay cues with priorities, safe areas and instant retraction.',
      Icon: RenderIcon,
    },
    {
      key: 'personalize',
      title: 'Personalize',
      description:
        'Casual, analyst and broadcast variants in multiple languages from the same facts.',
      Icon: PersonalizeIcon,
    },
  ],
} as const;

export const PRINCIPLES = {
  id: 'principles',
  eyebrow: 'Engineering principles',
  title: 'Built to be trusted on air',
  items: [
    {
      key: 'evidence',
      title: 'Evidence-linked claims',
      description:
        'Every published number resolves to event IDs and a metric version, or it is not published.',
      Icon: EvidenceIcon,
    },
    {
      key: 'deterministic',
      title: 'Deterministic by default',
      description:
        'Statistics come from pure, tested functions. Seeded replays reproduce identical state.',
      Icon: DeterministicIcon,
    },
    {
      key: 'resilience',
      title: 'Degrades gracefully',
      description:
        'Replay and match state run without AI. Model outages fall back to verified templates.',
      Icon: ResilienceIcon,
    },
  ],
} as const;
