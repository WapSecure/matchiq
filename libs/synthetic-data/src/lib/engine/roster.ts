import type {
  Player,
  PlayerId,
  PlayerPosition,
  Team,
} from '@matchiq/contracts';
import { ROLE_ZONE_WEIGHTS } from '../constants.js';
import type { Rng } from '../prng.js';
import { zoneOf } from './geometry.js';

export interface PickOptions {
  readonly exclude?: PlayerId;
  readonly outfieldOnly?: boolean;
}

export interface SubstitutionPair {
  readonly out: Player;
  readonly in: Player;
}

export type BookingResult = 'YELLOW' | 'SECOND_YELLOW';

/** Tracks who may act: starters and used substitutes, minus players subbed off or sent off. */
export class Roster {
  readonly team: Team;
  private onPitch: Player[];
  private bench: Player[];
  private readonly cautioned = new Set<PlayerId>();
  private readonly substitutesUsed = new Set<PlayerId>();

  constructor(team: Team) {
    this.team = team;
    this.onPitch = team.players.filter((p) => p.starting);
    this.bench = team.players.filter((p) => !p.starting);
  }

  get missingPlayers(): number {
    return (
      this.team.players.filter((p) => p.starting).length - this.onPitch.length
    );
  }

  keeper(): Player | undefined {
    return this.onPitch.find((p) => p.position === 'GK');
  }

  /** `x` is in this team's attacking frame. */
  pickByZone(rng: Rng, x: number, options: PickOptions = {}): Player {
    const zone = zoneOf(x);
    return this.pickWeighted(
      rng,
      (position) => ROLE_ZONE_WEIGHTS[position][zone],
      options,
    );
  }

  isCautioned(playerId: PlayerId): boolean {
    return this.cautioned.has(playerId);
  }

  book(playerId: PlayerId): BookingResult {
    if (this.cautioned.has(playerId)) return 'SECOND_YELLOW';
    this.cautioned.add(playerId);
    return 'YELLOW';
  }

  sendOff(playerId: PlayerId): void {
    this.onPitch = this.onPitch.filter((p) => p.playerId !== playerId);
  }

  substitute(rng: Rng): SubstitutionPair | null {
    const outfield = this.onPitch.filter(
      (p) => p.position !== 'GK' && !this.substitutesUsed.has(p.playerId),
    );
    if (outfield.length === 0) return null;
    const out = rng.pick(outfield);
    const sameRole = this.bench.filter((p) => p.position === out.position);
    const fallback = this.bench.filter((p) => p.position !== 'GK');
    const candidates = sameRole.length > 0 ? sameRole : fallback;
    if (candidates.length === 0) return null;
    const incoming = rng.pick(candidates);
    this.substitutesUsed.add(incoming.playerId);
    this.bench = this.bench.filter((p) => p.playerId !== incoming.playerId);
    this.onPitch = this.onPitch.map((p) =>
      p.playerId === out.playerId ? incoming : p,
    );
    return { out, in: incoming };
  }

  private pickWeighted(
    rng: Rng,
    weightOf: (position: PlayerPosition) => number,
    options: PickOptions,
  ): Player {
    const candidates = this.onPitch.filter(
      (p) =>
        p.playerId !== options.exclude &&
        !(options.outfieldOnly === true && p.position === 'GK'),
    );
    const weighted = candidates.map((p) => [p, weightOf(p.position)] as const);
    if (weighted.some(([, weight]) => weight > 0))
      return rng.weighted(weighted);
    return rng.pick(candidates);
  }
}
