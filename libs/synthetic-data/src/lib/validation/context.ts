import type { Fixture, MatchEvent, Player } from '@matchiq/contracts';
import type { FixtureIssue, FixtureIssueCode } from './issues.js';

/** Running match facts accumulated while walking the stream in sequence order. */
export class ValidationContext {
  readonly fixture: Fixture;
  readonly issues: FixtureIssue[] = [];
  readonly players = new Map<string, Player>();
  readonly onPitch = new Set<string>();
  readonly everOnPitch = new Set<string>();
  readonly cautioned = new Set<string>();
  readonly byId = new Map<string, MatchEvent>();
  readonly resolved = new Set<string>();
  readonly goals = new Map<string, number>();
  possession: string | null | undefined = undefined;
  openPeriod: number | null = null;
  lastPeriod = 0;
  started = false;
  ended = false;
  previous: MatchEvent | null = null;

  constructor(fixture: Fixture) {
    this.fixture = fixture;
    for (const team of [fixture.home, fixture.away]) {
      this.goals.set(team.teamId, 0);
      for (const player of team.players) {
        this.players.set(player.playerId, player);
        if (player.starting) {
          this.onPitch.add(player.playerId);
          this.everOnPitch.add(player.playerId);
        }
      }
    }
  }

  isFixtureTeam(teamId: string): boolean {
    return (
      teamId === this.fixture.home.teamId || teamId === this.fixture.away.teamId
    );
  }

  otherTeam(teamId: string): string {
    return teamId === this.fixture.home.teamId
      ? this.fixture.away.teamId
      : this.fixture.home.teamId;
  }

  report(
    code: FixtureIssueCode,
    event: MatchEvent | null,
    message: string,
  ): void {
    this.issues.push({
      code,
      message,
      ...(event === null
        ? {}
        : { sequence: event.sequence, eventId: event.eventId }),
    });
  }
}
