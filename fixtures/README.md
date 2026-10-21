# Golden fixtures (synthetic)

**Every file in this directory is simulated data.** Clubs, players and events are invented by `libs/synthetic-data` (generator `0.1.0`). No Premier League or other real-world data, names or marks are used. Any UI or export built from these files must keep the synthetic label visible.

Each file has the shape `{ fixture, events, manifest }`. `fixture` and every entry in `events` validate against the `Fixture` and `MatchEvent` contracts in `libs/contracts`. The manifest records the generator version, seed, scenario, event count, final score and `eventsHash`: the SHA-256 of the canonical JSON (keys sorted at every depth) of the `events` array.

| File                        | Scenario               | Seed | Events | Score (H-A) | eventsHash                                                         |
| --------------------------- | ---------------------- | ---- | ------ | ----------- | ------------------------------------------------------------------ |
| `comeback.json`             | `comeback`             | 42   | 1470   | 3-2         | `a9f052c3269591b3895aaf920984c253b233715d9cbb2ed972f68fd5dd7c310c` |
| `possession-dominance.json` | `possession-dominance` | 42   | 1356   | 0-0         | `9c0e2f1b9801a71328a2fd890fcee37f90370fb9c21c83f63961bc70b475f67b` |
| `red-card-swing.json`       | `red-card-swing`       | 42   | 1403   | 1-2         | `75daa5cca013b0f041d4f5875a459876805b116b5a0adee0ba86dbb595632a7b` |
| `high-press.json`           | `high-press`           | 42   | 1361   | 0-0         | `09e36e761a82036fea2f2817bc5a510f6810b9f5a30b5865bc4c16a4db0563e1` |
| `low-event.json`            | `low-event`            | 42   | 1016   | 0-0         | `1b82c4c9f4956b638190062880dc3ff99912197fcc37f1aab7fcde63ca437d7a` |

## Scenarios

- **comeback** (golden demo, spec §13 fixture A): the away side scores around 22' and 41'. The home side scores around 64', 77' and 87' to win 3-2. Goals are scripted beats, so the result holds for every seed. Only the build-up and scorers vary.
- **possession-dominance** (B): the home side is much stronger and keeps the ball (about 85% of completed passes at seed 42; above 65% across 400 sampled seeds) but cannot score, so the game ends 0-0. Natural goals are disabled.
- **red-card-swing** (C): home leads around 14', has a player sent off with a straight red around 31', then the away side scores around 58' and 79' to win 1-2. The ten men play with reduced strength and pressing.
- **high-press** (D): both sides press hard, which produces the most pressures, tackles, fouls and turnovers. Natural goals are on, so the score depends on the seed.
- **low-event** (E): a slow, cagey game with few shots and long stoppages. `SHOT.speedKph` is deliberately omitted, which covers the "missing speed data" case.

## Commands

```bash
pnpm generate:fixture --seed 42 --scenario comeback --out fixtures/comeback.json
pnpm validate:fixture fixtures/*.json
```

`validate:fixture` checks contract validity, gap-free sequences, unique IDs, per-period clock monotonicity, period structure, player and team membership and on-pitch status (substitutions and dismissals are respected), references (pass attempts, shots and fouls), and that the score comes only from `GOAL` events. It also checks the manifest against the events. The golden test (`libs/synthetic-data/tests/golden.spec.ts`) fails if the generator stops reproducing these files exactly (same JSON, same hash). If you change the generator on purpose, regenerate all five files and update the hashes in that test and in this table.

## Conventions

- `matchClockMs` restarts at 0 in each period. Display minute = `(period - 1) * 45 + floor(matchClockMs / 60000)`, so values past 45:00 within a period are stoppage time.
- `wallClockUtc` = kickoff + first-half length + 15-minute break (for period 2) + `matchClockMs`.
- Coordinates are normalised 0-100 in the acting team's attacking direction (x towards the goal it attacks).
- `POSSESSION_CHANGED` is emitted only when control changes. `teamId: null` marks dead-ball or contested time.
