'use client';

import { useMemo } from 'react';
import type { Roster } from '../lib/roster';
import { buildSeekMarks, type SeekMark } from '../lib/seek-marks';
import { useMatchStore } from '../store';

export const useSeekMarks = (roster: Roster | undefined): SeekMark[] => {
  const timeline = useMatchStore((s) => s.timeline);
  const voided = useMatchStore((s) => s.voided);
  const insights = useMatchStore((s) => s.insights);
  return useMemo(
    () => (roster ? buildSeekMarks(timeline, voided, insights, roster) : []),
    [timeline, voided, insights, roster],
  );
};
