import { expect, test } from '@playwright/test';
import {
  expectNoBlockingA11yViolations,
  expectNoHorizontalOverflow,
} from './support/a11y';
import { mockApi } from './support/mock-api';
import { FIXTURE_ID } from './support/mock-fixture';

test.describe('demo failure scenarios in the AI fact-checks (ADR-0020)', () => {
  test('labels simulated failures and shows each recovery chain', async ({
    page,
  }, info) => {
    await mockApi(page, { faults: true });
    await page.goto(`/studio/${FIXTURE_ID}/observatory`);
    const traces = page.getByRole('list', {
      name: 'Key moments and their checks',
    });
    await expect(traces.getByRole('article')).toHaveCount(4);

    const chains = page.getByTestId('fault-chain');
    await expect(chains).toHaveCount(2);
    await expect(chains.nth(0)).toContainText(
      'Simulated failure (demo): Wrong number fixed',
    );
    await expect(chains.nth(0)).toContainText(
      'The fact checker caught it and the writer corrected it.',
    );
    await expect(chains.nth(0)).toContainText('What went on air: AI wording');
    await expect(chains.nth(0)).not.toContainText('REVISE');

    await expect(chains.nth(1)).toContainText(
      'Simulated failure (demo): AI timed out',
    );
    await expect(chains.nth(1)).toContainText(
      'Standard wording went on air on time',
    );
    await expect(chains.nth(1)).toContainText(
      'What went on air: Standard wording',
    );
    const notes = page.getByTestId('fault-notes');
    await expect(notes.nth(0)).toContainText('Fact Checker returned REVISE');
    await expect(notes.nth(1)).toContainText('Circuit breaker open');

    await expect(page.getByTestId('fallback-note')).toContainText(
      '1 moment used standard wording because the AI was slow or unavailable.',
    );

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
