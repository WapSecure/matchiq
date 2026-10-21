export const LOBBY_COPY = {
  metaTitle: 'Fixture Lobby',
  eyebrow: 'Fixture lobby',
  title: 'Choose a synthetic fixture',
  description:
    'Each fixture is generated from a fixed seed, so every replay reproduces the same events and match state. Start a replay to open the live studio.',
  listLabel: 'Synthetic fixtures',
  kickoff: 'Kick-off',
  seedLabel: 'Seed',
  scenario: 'Scenario',
  start: 'Start replay',
  starting: 'Starting…',
  openStudio: 'Open studio',
  speedLabel: 'Replay speed',
  startFailed: 'Replay could not be started',
  empty: {
    title: 'No fixtures available',
    description:
      'The API returned no synthetic fixtures. Seed a fixture with the generator, then refresh.',
  },
  error: { title: 'Fixtures could not be loaded' },
  retry: 'Try again',
  loading: 'Loading fixtures',
} as const;
