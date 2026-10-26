import { TOUR_STEPS, type TourStep } from '@/constants/guide';

export type ResolvedStep = { step: TourStep; selector: string };

const isShown = (el: Element): boolean =>
  typeof el.checkVisibility === 'function' ? el.checkVisibility() : true;

export const findTarget = (selector: string): HTMLElement | null => {
  const el = document.querySelector<HTMLElement>(selector);
  return el && isShown(el) ? el : null;
};

/** Steps whose region is on screen at this width, in tour order. */
export function resolveSteps(): ResolvedStep[] {
  return TOUR_STEPS.flatMap((step) => {
    const selector = step.targets.find((t) => findTarget(t) !== null);
    return selector ? [{ step, selector }] : [];
  });
}
