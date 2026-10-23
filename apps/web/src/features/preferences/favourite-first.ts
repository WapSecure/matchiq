import type { Persona } from '@matchiq/contracts';

/** Only the fan view leans towards a favourite team; analysts and producers see match order. */
export const biasesFavourite = (
  persona: Persona,
  favouriteTeamId: string | null,
): favouriteTeamId is string =>
  persona === 'CASUAL' && favouriteTeamId !== null;

/**
 * The favourite team's moments first, each group keeping its own order.
 * Reorders only: nothing is dropped, so every moment and score stays visible.
 */
export const favouriteFirst = <T extends { teamId?: string }>(
  items: readonly T[],
  favouriteTeamId: string,
): T[] => [
  ...items.filter((item) => item.teamId === favouriteTeamId),
  ...items.filter((item) => item.teamId !== favouriteTeamId),
];
