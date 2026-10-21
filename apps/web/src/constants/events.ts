export const EVENT_DETAIL = {
  shotOutcome: {
    ON_TARGET: 'On target',
    OFF_TARGET: 'Off target',
    BLOCKED: 'Blocked',
    WOODWORK: 'Hit the woodwork',
  },
  card: { YELLOW: 'Yellow', SECOND_YELLOW: 'Second yellow', RED: 'Red' },
  ownGoal: 'Own goal',
  assist: (name: string) => `Assist ${name}`,
  substitution: (playerIn: string, playerOut: string) =>
    `${playerIn} on for ${playerOut}`,
  won: 'Won',
  lost: 'Lost',
  correction: (eventId: string, reason: string) =>
    `Voids ${eventId}: ${reason}`,
} as const;
