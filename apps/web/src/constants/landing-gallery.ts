import {
  BroadcastIcon,
  EvidenceIcon,
  FileIcon,
  KeyboardIcon,
  PersonalizeIcon,
  SpeakerIcon,
} from '@/components/icons';

export const GUIDE_CTA = {
  label: 'Take the three-minute tour',
  href: '/guide',
} as const;

export const GALLERY = {
  id: 'gallery',
  eyebrow: 'See it working',
  title: 'Real screens from a simulated match',
  description:
    'Every screen below is the product itself, running on a fictional match. Nothing here is mocked up.',
  shots: [
    {
      key: 'studio',
      src: '/landing/studio-live-full-time.webp',
      alt: 'The live studio at full time, showing the score, the match story so far and the broadcast graphics queue.',
      title: 'Live studio',
      caption:
        'Follow the match to the final whistle, with every moment explained as it happens.',
    },
    {
      key: 'evidence',
      src: '/landing/evidence-drawer-compared-with.webp',
      alt: 'The evidence drawer open on a moment, listing the plays and stats behind it and a Compared with block.',
      title: 'Evidence on every claim',
      caption:
        'Open any moment to see the plays behind it and how the numbers compare with the rest of the match.',
    },
    {
      key: 'observatory',
      src: '/landing/fact-checks-recorded-session.webp',
      alt: 'The AI fact-checks page for an earlier replay, with every moment written and checked.',
      title: 'Fact checks',
      caption:
        'An earlier replay, with every moment written automatically and checked before it could air.',
    },
    {
      key: 'recap',
      src: '/landing/recap-match-story.webp',
      alt: 'The match recap page, telling the story of the match in order.',
      title: 'Match recap',
      caption:
        'The whole match as one readable story, ready to share once the final whistle goes.',
    },
  ],
  width: 1280,
  height: 720,
} as const;

export const CAPABILITIES = {
  id: 'capabilities',
  eyebrow: 'What you can do',
  title: 'Everything a producer and a fan need',
  items: [
    {
      key: 'live',
      title: 'Follow the match live',
      description:
        'Moments appear as they happen, with the score and stats beside them.',
      Icon: BroadcastIcon,
    },
    {
      key: 'evidence',
      title: 'See the proof',
      description: 'Every claim opens to the plays and numbers behind it.',
      Icon: EvidenceIcon,
    },
    {
      key: 'audiences',
      title: 'Fans, analysts, broadcast',
      description:
        'Three styles of telling it, in English, French, Spanish and Nigerian Pidgin.',
      Icon: PersonalizeIcon,
    },
    {
      key: 'listen',
      title: 'Listen to a moment',
      description: 'Hear any moment read aloud in the language you pick.',
      Icon: SpeakerIcon,
    },
    {
      key: 'approve',
      title: 'Approve with a keystroke',
      description:
        'Producers approve or pull graphics with the keyboard, and nothing airs unchecked.',
      Icon: KeyboardIcon,
    },
    {
      key: 'recap',
      title: 'Recap and match report',
      description: 'Finish with the match story and a report you can keep.',
      Icon: FileIcon,
    },
  ],
} as const;
