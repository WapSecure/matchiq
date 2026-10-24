# ADR-0023: Player Focus scope and saved viewing preferences

- Status: Accepted (2026-10-23, MQ-066). Refines spec §27, §29, §31.6, §45, E13, US-012 and US-014.

## Context

Spec §27 describes a player-focused mode that shows "touches, involvement, distance and triggered milestones when data is sufficient", using `PLAYER_POSITION` where it is permitted. §31.6 adds an involvement map and optional speed and distance, and requires a visible "not available" state when tracking is absent. §27 also lists audience dimensions (favourite team, tracked players, locale, accessibility mode) that a viewer should keep between visits, and §29/§45 name a `GET`/`PUT` preferences endpoint guarded by `preferences:write`.

None of the five synthetic fixtures carries `PLAYER_POSITION` or `BALL_POSITION` samples, and the engine has no player-level projection. Persona and language lived only in memory.

## Decision

### Player Focus counts only match events

- A pure function, `playerInvolvement(events, playerId)` in `libs/football-engine` (browser-safe entry `@matchiq/football-engine/player`), counts the events where the player is the actor: passes attempted and completed, shots and shots on target, pressures, recoveries, goals and cards. CORRECTION-voided and duplicate events are dropped, and actions are ordered by `sequence`.
- A pass counts as completed when its `PASS_COMPLETED` exists. That event is credited to the receiver, so the projection joins it back to the passer through `attemptEventId`. Own goals are credited to the opponent and are not part of the player's involvement.
- Milestones are limited to **first shot on target**, **goal** (each one), **booked** and **sent off** (a second yellow or a straight red). Assists, pass streaks and "first touch" are left out: an assist needs a rule for which shot it belongs to, and "touches" cannot be counted honestly without a possession model per player.
- Speed, distance, heat maps and inferred positions are **not shown**. The panel always shows "No tracking data. Counts come from match events only". When tracking fixtures exist, distance and speed belong in the engine with their own `metricRef` and an `unavailable` state, never in the UI.
- The involvement map is the existing pitch map, with the followed player's events ringed. The event timeline marks them too.
- Key moments "featuring" the player are those whose `playerId` is the player or whose evidence cites one of their events.
- The web counts from the whole ledger (paged from `GET /fixtures/{id}/events`, then merged with live events), because the studio's live window is bounded.

### Favourite team is a presentation bias

In the fan (`CASUAL`) persona, the favourite team's key moments come first and are marked "Your team". Nothing is filtered out, so the score and every important event stay visible (US-014), and no statistic changes. The analyst and broadcast views keep match order.

### Saved viewing preferences

- `preference_profiles` holds one row per organisation and identity-provider subject: persona, locale, favourite team, up to three followed players (most recent first) and reduced motion. It has the ADR-0018 row-level-security policy. Nothing else about the person is stored.
- `GET /api/v1/me/preferences` returns the profile or the defaults (`updatedAt: null`). `PUT` replaces it and is idempotent: an identical body changes nothing, `updatedAt` included. Both require `preferences:write`, which the public demo role lacks.
- Anonymous viewers keep the same profile in `localStorage`, read and written inside `try/catch`. Device choices are applied in a layout effect before the first paint. On sign-in, a stored account profile wins; an account that has never saved adopts the device choices.
- The followed list is capped at three to keep the profile small (spec §48 privacy: collect the minimum necessary).

## Alternatives considered

- **Compute player counts in the API.** It would add a read model for something the browser can derive from events it already loads, and the engine function stays the single definition either way.
- **Infer positions from event locations as a heat map.** Rejected: §27 forbids inferred player location when tracking is absent.
- **Filter the feed to the favourite team.** Rejected: US-014 requires global events to stay visible.

## Consequences

- Player Focus works on every current fixture and stays truthful about what it cannot measure.
- Adding tracking data later means a new engine metric and an `unavailable` state, not a UI change to the counts.
- Preference rows may be personal data (spec §48); deleting a user's row is a single keyed delete.
