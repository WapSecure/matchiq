/** Copy owned by the shared UI components in `components/ui`. */
export const UI_COPY = {
  selectPlaceholder: 'Choose an option',
  comboboxPlaceholder: 'Type to search',
  noResults: 'No matches. Try a different word.',
  loading: 'Loading…',
  clear: 'Clear',
  showOptions: 'Show options',
  moreActions: 'More actions',
  moreInfo: 'More about this',
  dismiss: 'Dismiss',
} as const;

export const DATE_COPY = {
  presets: 'Quick ranges',
  custom: 'Custom range',
  clear: 'Clear dates',
  apply: 'Use these dates',
  start: 'Start',
  end: 'End',
  openCalendar: 'Open calendar',
  utc: 'UTC',
  local: 'Your time',
  zoneNote: (zone: string) =>
    `Times are in your time zone (${zone}). They are sent to the server in UTC.`,
  utcEcho: (utc: string) => `${utc} UTC`,
  anyTime: 'Any time',
  rangeTooLong: 'The end must be after the start.',
} as const;

export const DATE_PRESET_LABELS = {
  last15m: 'Last 15 minutes',
  lastHour: 'Last hour',
  today: 'Today',
  last24h: 'Last 24 hours',
  last7d: 'Last 7 days',
  thisMatch: 'This match',
} as const;

export type DatePresetId = keyof typeof DATE_PRESET_LABELS;

export const FILE_COPY = {
  drop: 'Drag a file here',
  dropMany: 'Drag files here',
  or: 'or',
  browse: 'Choose a file',
  browseMany: 'Choose files',
  dropActive: 'Drop to add',
  accepts: (types: string, max: string) => `${types} up to ${max}`,
  tooLarge: (name: string, max: string) =>
    `${name} is larger than ${max}. Choose a smaller file.`,
  wrongType: (name: string, types: string) =>
    `${name} is not a supported file. Use ${types}.`,
  tooMany: (max: number) =>
    `You can add up to ${max} file${max === 1 ? '' : 's'} at a time.`,
  remove: (name: string) => `Remove ${name}`,
  uploading: 'Uploading',
  done: 'Ready',
  failed: 'Failed',
  progress: (name: string) => `Upload progress for ${name}`,
} as const;

export const FILE_SIZE_UNITS = ['B', 'KB', 'MB', 'GB'] as const;
export const BYTES_PER_UNIT = 1024;
