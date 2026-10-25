/** Markers closer than this share of the timeline would overlap, so they stack. */
const OVERLAP_SHARE = 0.04;
const MAX_LANES = 6;

/** A new lane while there is room, else the one whose last marker is oldest. */
const freeLane = (lastInLane: readonly number[]): number =>
  lastInLane.length < MAX_LANES
    ? lastInLane.length
    : lastInLane.indexOf(Math.min(...lastInLane));

/**
 * Lane per marker (0 = on the line). A marker takes the first lane whose last
 * marker is far enough away, so same-minute moments stack upward.
 */
export function assignLanes(
  positions: readonly number[],
  span: number,
): number[] {
  const gap = span * OVERLAP_SHARE;
  const lastInLane: number[] = [];
  const order = positions
    .map((at, index) => ({ at, index }))
    .sort((a, b) => a.at - b.at);
  const lanes = new Array<number>(positions.length).fill(0);
  for (const { at, index } of order) {
    let lane = lastInLane.findIndex((end) => at - end >= gap);
    if (lane === -1) lane = freeLane(lastInLane);
    lastInLane[lane] = at;
    lanes[index] = lane;
  }
  return lanes;
}
