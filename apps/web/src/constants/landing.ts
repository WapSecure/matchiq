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
  title: 'Football insight. Ready for editorial review.',
  description:
    'Follow the match, inspect the evidence and control what goes on air. MatchIQ brings match analytics, commentary and broadcast overlay previews into one workspace.',
  primaryCta: { label: 'Explore the demo', href: '/fixtures' },
  howItWorks: { label: 'How it works', href: '#pipeline' },
  facts: [
    { value: 'Evidence', label: 'Trace insights to match events' },
    { value: 'Control', label: 'Hold or retract broadcast cues' },
    { value: 'Replay', label: 'Review the same match together' },
  ],
  disclosure:
    'Demo runs on seeded synthetic matches. No real clubs, players or league marks.',
} as const;

export const PIPELINE = {
  id: 'pipeline',
  eyebrow: 'Match workflow',
  title: 'Five stages, one source of truth',
  description:
    'Follow each insight from its source events to the screen. Match statistics remain the reference for every audience and language.',
  stages: [
    {
      key: 'ingest',
      title: 'Ingest',
      description:
        'Validate incoming events, preserve their source and keep them in match order.',
      Icon: IngestIcon,
    },
    {
      key: 'interpret',
      title: 'Interpret',
      description:
        'Track match statistics and identify changes with supporting events.',
      Icon: InterpretIcon,
    },
    {
      key: 'explain',
      title: 'Explain',
      description:
        'Agents propose commentary. Automated checks verify numbers, names and citations before publication.',
      Icon: ExplainIcon,
    },
    {
      key: 'render',
      title: 'Render',
      description:
        'Preview timed graphics and retract a cue when editorial judgment calls for it.',
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
  eyebrow: 'Editorial confidence',
  title: 'Check the evidence. Keep control.',
  items: [
    {
      key: 'evidence',
      title: 'Traceable claims',
      description:
        'Inspect the source events and metric definitions behind each published number.',
      Icon: EvidenceIcon,
    },
    {
      key: 'deterministic',
      title: 'Consistent match facts',
      description:
        'Replay the same fixture with reproducible statistics. Commentary does not change the underlying facts.',
      Icon: DeterministicIcon,
    },
    {
      key: 'resilience',
      title: 'Continuity during model outages',
      description:
        'Match playback continues without a model connection. Verified templates provide fallback commentary.',
      Icon: ResilienceIcon,
    },
  ],
} as const;
