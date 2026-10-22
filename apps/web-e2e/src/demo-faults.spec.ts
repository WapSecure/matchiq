import { expect, test } from '@playwright/test';
import {
  expectNoBlockingA11yViolations,
  expectNoHorizontalOverflow,
} from './support/a11y';
import { mockApi } from './support/mock-api';
import { FIXTURE_ID } from './support/mock-fixture';

test.describe('demo fault scenarios in the agent observatory (ADR-0017)', () => {
  test('labels simulated failures and shows each recovery chain', async ({
    page,
  }, info) => {
    await mockApi(page, { faults: true });
    await page.goto(`/studio/${FIXTURE_ID}/observatory`);
    const traces = page.getByRole('list', { name: 'Insight traces' });
    await expect(traces.getByRole('article')).toHaveCount(4);

    const chains = page.getByTestId('fault-chain');
    await expect(chains).toHaveCount(2);
    await expect(chains.nth(0)).toContainText(
      'Simulated failure (demo): Revise',
    );
    await expect(chains.nth(0)).toContainText('Fact Checker returned REVISE');
    await expect(chains.nth(0)).toContainText('Constrained revision');
    await expect(chains.nth(0)).toContainText('Final source: Agent');

    await expect(chains.nth(1)).toContainText(
      'Simulated failure (demo): Timeout',
    );
    await expect(chains.nth(1)).toContainText('Timed out');
    await expect(chains.nth(1)).toContainText('Circuit breaker open');
    await expect(chains.nth(1)).toContainText('Final source: Template');

    // Traces without a fault plan carry no badge.
    await expect(traces.getByRole('article').first()).not.toContainText(
      'Simulated failure',
    );

    await expectNoHorizontalOverflow(page);
    await expectNoBlockingA11yViolations(page);
    await chains.nth(0).scrollIntoViewIfNeeded();
    await page.screenshot({
      path: info.outputPath(`observatory-faults-${info.project.name}.png`),
      fullPage: true,
    });
  });
});
