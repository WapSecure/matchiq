import { LIMITS, type OverlayCue } from '@matchiq/contracts';
import { COPY_FIT } from '@/constants/approval';

export type FitLevel = keyof typeof COPY_FIT.labels;

export type FieldFit = { length: number; max: number; level: FitLevel };

export type CopyFit = { headline: FieldFit; body: FieldFit; level: FitLevel };

const RANK: Record<FitLevel, number> = { fits: 0, tight: 1, over: 2 };

export const fitLevel = (length: number, max: number): FitLevel => {
  if (length > max) return 'over';
  return length > max * COPY_FIT.tightRatio ? 'tight' : 'fits';
};

const field = (text: string, max: number): FieldFit => ({
  length: text.length,
  max,
  level: fitLevel(text.length, max),
});

/** How the cue's copy sits against the broadcast graphic's length limits. */
export const copyFitOf = (
  cue: Pick<OverlayCue, 'headline' | 'body'>,
): CopyFit => {
  const headline = field(cue.headline, LIMITS.overlayHeadlineMax);
  const body = field(cue.body, LIMITS.overlayBodyMax);
  const level =
    RANK[headline.level] >= RANK[body.level] ? headline.level : body.level;
  return { headline, body, level };
};
