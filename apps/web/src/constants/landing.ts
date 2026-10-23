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
  eyebrow: 'Football intelligence for live broadcast',
  title: 'One trusted match feed. Every audience, every language.',
  description:
    'MatchIQ spots the moments that matter in seconds. The stats come straight from the match data, AI explains why each moment matters, a fact check confirms every number, and producers get on-air graphics they can trust and pull at any time.',
  primaryCta: { label: 'Choose a match', href: '/fixtures' },
  howItWorks: { label: 'See how it works', href: '#pipeline' },
  facts: [
    { value: '0', label: 'numbers made up by AI' },
    { value: '3 × 4', label: 'audiences × languages, same facts' },
    { value: '16:9', label: 'on-air preview with safe areas' },
  ],
  disclosure:
    'The demo uses fictional, simulated matches. No real clubs, players or league marks.',
} as const;

export const PIPELINE = {
  id: 'pipeline',
  eyebrow: 'How it works',
  title: 'Five steps from the pitch to the screen',
  description:
    'Every fact is worked out once from the match data. AI explains the facts but never changes them.',
  stages: [
    {
      key: 'ingest',
      title: 'Collect',
      description:
        'Every pass, shot and tackle is recorded once, in order, with where it came from.',
      Icon: IngestIcon,
    },
    {
      key: 'interpret',
      title: 'Understand',
      description:
        'Live score, possession, momentum and other stats, worked out the same way every time.',
      Icon: InterpretIcon,
    },
    {
      key: 'explain',
      title: 'Explain',
      description:
        'AI analyst, writer and fact checker turn key moments into words, each tied to the plays behind it.',
      Icon: ExplainIcon,
    },
    {
      key: 'render',
      title: 'Show',
      description:
        'On-air graphics timed to the match, kept inside safe areas, and removable in one click.',
      Icon: RenderIcon,
    },
    {
      key: 'personalize',
      title: 'Personalise',
      description:
        'Versions for fans, analysts and broadcast, in English, French, Spanish and Nigerian Pidgin, from the same facts.',
      Icon: PersonalizeIcon,
    },
  ],
} as const;

export const PRINCIPLES = {
  id: 'principles',
  eyebrow: 'Why you can trust it',
  title: 'Built to be trusted on air',
  items: [
    {
      key: 'evidence',
      title: 'Every claim shows its evidence',
      description:
        'Each number on screen links back to the plays and the stat it came from. If it cannot, it does not air.',
      Icon: EvidenceIcon,
    },
    {
      key: 'deterministic',
      title: 'Same match, same numbers',
      description:
        'Stats are worked out by tested rules, not AI. Replay a match and you get exactly the same figures.',
      Icon: DeterministicIcon,
    },
    {
      key: 'resilience',
      title: 'Keeps going if AI fails',
      description:
        'Scores and stats never depend on AI. If the AI is slow or wrong, standard wording goes on air instead.',
      Icon: ResilienceIcon,
    },
  ],
} as const;
