import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import {
  ADVISORY_ANNOTATION,
  ADVISORY_TAGS,
  BLOCKING_IMPACT_THRESHOLD,
  DISABLED_RULES,
  IMPACT_ORDER,
  WCAG_TAGS,
} from './a11y-constants';

type Result = Awaited<ReturnType<AxeBuilder['analyze']>>['violations'][number];

const atOrAboveThreshold = (v: Result) =>
  IMPACT_ORDER.indexOf(v.impact ?? 'minor') >=
  IMPACT_ORDER.indexOf(BLOCKING_IMPACT_THRESHOLD);

const describeViolation = (v: Result) =>
  `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(' ')).join(', ')})`;

const analyze = (page: Page, tags: string[]) =>
  new AxeBuilder({ page })
    .withTags(tags)
    .disableRules(DISABLED_RULES)
    .analyze();

/** Cue entrance animations are frozen so contrast is measured at rest. */
export const expectNoBlockingA11yViolations = async (page: Page) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const { violations } = await analyze(page, WCAG_TAGS);
  expect(violations.filter(atOrAboveThreshold).map(describeViolation)).toEqual(
    [],
  );
  const advisory = await analyze(page, ADVISORY_TAGS);
  for (const v of advisory.violations) {
    test.info().annotations.push({
      type: ADVISORY_ANNOTATION,
      description: describeViolation(v),
    });
  }
};

export const expectNoHorizontalOverflow = async (page: Page) => {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
};
