import type { UploadItem } from '@/components/ui';

/** Copy and sample data for the component gallery (`/design-system`); dev and demo only. */
export const GALLERY_COPY = {
  metaTitle: 'Design system',
  eyebrow: 'Design system',
  title: 'Component gallery',
  description:
    'Every shared control in both themes. Hover, focus with the keyboard and press to see the interactive states; the static states are shown side by side.',
  themes: { light: 'Light theme', dark: 'Dark theme' },
  states: {
    default: 'Default',
    described: 'With descriptions',
    grouped: 'Grouped, with a disabled reason',
    invalid: 'Invalid',
    disabled: 'Disabled',
    loading: 'Loading',
    medium: 'Medium size',
    searchable: 'Searchable',
    selected: 'Selected',
    indeterminate: 'Indeterminate',
    card: 'Card',
    pending: 'Pending',
  },
  sections: {
    actions: 'Buttons and text fields',
    select: 'Select and combobox',
    dates: 'Dates and times',
    choices: 'Switches, checkboxes and radios',
    overlays: 'Tooltip, popover, menu and disclosure',
    feedback: 'Toast, modal and drawer',
    upload: 'File upload',
  },
  locales: {
    'en-GB': 'English (UK)',
    'fr-FR': 'Français',
    'es-ES': 'Español',
    'pcm-NG': 'Naijá (uses UK dates)',
  },
  invalidMessage: 'Choose an option to continue.',
  dateInvalid: 'Choose a date before the match ends.',
  textLabel: 'Fixture name',
  textValue: 'Northbridge v Harbourside',
  textInvalid: 'Use at least three characters.',
  textareaLabel: 'Reason',
  primary: 'Start replay',
  secondary: 'Restart',
  ghost: 'Cancel',
  danger: 'Kill switch',
  tooltipTrigger: 'Hover or focus me',
  tooltipText:
    'Tooltips add context. They never hold the only copy of a label.',
  hintBadge: 'Provisional',
  hintBadgeText: 'Figures may change until the replay worker confirms them.',
  popoverTrigger: 'What is a seed?',
  popoverTitle: 'Fixed seeds',
  popoverBody:
    'The generator uses a fixed seed, so every replay produces the same events in the same order.',
  menuTrigger: 'Session actions',
  disclosureTitle: 'View as table',
  disclosureMeta: '3 rows',
  disclosureBody:
    'Disclosures replace native details elements: a real button, an expanded state and a smooth height change.',
  accordion: [
    'Why synthetic data?',
    'What does the publish gate check?',
    'Who can use the kill switch?',
  ],
  accordionBody: 'Short answers live here. Only one section is open at a time.',
  toastSaved: 'Auto-publish frozen. Producers can still air cues by hand.',
  toastNeutral: 'Already frozen. Nothing changed.',
  toastCritical:
    'The command could not be sent. Check your connection and try again.',
  openModal: 'Open modal',
  openDrawer: 'Open drawer',
  modalTitle: 'Retract this cue?',
  modalBody:
    'The cue leaves the programme output straight away. The audit trail records who did it and why.',
  drawerTitle: 'Evidence',
  close: 'Close',
  confirm: 'Retract cue',
  switchLabel: 'Auto-publish',
  switchDescription: 'Cues that pass the gate go to air without a producer.',
  checkboxLabel: 'Show simulated failures',
  checkboxDescription: 'Adds a labelled demo fault to every third insight.',
  checkboxInvalid: 'Confirm before you continue.',
  uploadLabel: 'Fixture import',
  uploadAcceptLabel: 'JSON or CSV',
  labels: {
    speed: 'Replay speed',
    role: 'Role',
    team: 'Team',
    persona: 'Audience',
  },
  dateLabel: 'Kick-off date',
  dateTimeLabel: 'Kick-off time',
  rangeLabel: 'Audit window',
} as const;

export const GALLERY_OPTIONS = {
  speeds: [
    {
      id: '1',
      label: 'Real time (1×)',
      description: 'A full match takes about 90 minutes.',
    },
    {
      id: '5',
      label: 'Brisk (5×)',
      description: 'About 18 minutes; good for a walkthrough.',
    },
    {
      id: '30',
      label: 'Highlights (30×)',
      description: 'About 3 minutes; good for a quick demo.',
    },
  ],
  roles: [
    {
      title: 'Editorial',
      options: [
        {
          id: 'producer',
          label: 'Producer',
          description: 'Freezes publishing and retracts cues.',
        },
        {
          id: 'editor',
          label: 'Editor',
          description: 'Suppresses insights before they air.',
        },
      ],
    },
    {
      title: 'Platform',
      options: [
        {
          id: 'operator',
          label: 'Operator',
          description: 'Runs the kill switch.',
        },
        {
          id: 'admin',
          label: 'Administrator',
          disabledReason: 'Only one administrator per organisation.',
        },
      ],
    },
  ],
  teams: [
    { id: 'northbridge', label: 'Northbridge Athletic' },
    { id: 'harbourside', label: 'Harbourside Rovers' },
    { id: 'kingsford', label: 'Kingsford Albion' },
    { id: 'northport', label: 'Northport Albion' },
    { id: 'eastmere', label: 'Eastmere Town' },
  ],
  persona: [
    { value: 'casual', label: 'Casual' },
    { value: 'analyst', label: 'Analyst' },
    { value: 'broadcast', label: 'Broadcast' },
  ],
  menu: [
    { id: 'open', label: 'Open studio', shortcut: 'O' },
    {
      id: 'recap',
      label: 'View recap',
      description: 'Moments, metrics and narratives.',
    },
    { id: 'copy', label: 'Copy session link' },
    { id: 'purge', label: 'Delete session', tone: 'danger', separated: true },
  ],
} as const;

export const GALLERY_UPLOAD_LIMIT_BYTES = 2 * 1024 * 1024;
export const GALLERY_UPLOAD_TYPES = [
  'application/json',
  '.json',
  'text/csv',
  '.csv',
] as const;

export const GALLERY_UPLOAD_SAMPLES: readonly UploadItem[] = [
  {
    id: 's1',
    name: 'fixtures-week-9.json',
    size: 48_211,
    progress: 64,
    status: 'uploading',
  },
  {
    id: 's2',
    name: 'squad-list.csv',
    size: 9_604,
    progress: null,
    status: 'uploading',
  },
  { id: 's3', name: 'kits.json', size: 2_048, progress: 100, status: 'done' },
  {
    id: 's4',
    name: 'broken.json',
    size: 1_310,
    progress: null,
    status: 'error',
    error: 'Line 4 is not valid JSON. Fix it and try again.',
  },
];
