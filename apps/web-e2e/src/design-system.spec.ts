import { expect, test } from '@playwright/test';
import {
  expectNoBlockingA11yViolations,
  expectNoHorizontalOverflow,
} from './support/a11y';

const GALLERY = '/design-system';
const SECTIONS = [
  'Buttons and text fields',
  'Select and combobox',
  'Dates and times',
  'Switches, checkboxes and radios',
  'Tooltip, popover, menu and disclosure',
  'Toast, modal and drawer',
  'File upload',
];

test.describe('component gallery (ADR-0021)', () => {
  test('renders every section in both themes without blocking violations', async ({
    page,
  }, info) => {
    await page.goto(GALLERY);
    await expect(
      page.getByRole('heading', { level: 1, name: 'Component gallery' }),
    ).toBeVisible();
    const light = page.getByRole('region', { name: 'Light theme' });
    const dark = page.getByRole('region', { name: 'Dark theme' });
    for (const pane of [light, dark]) {
      for (const section of SECTIONS)
        await expect(
          pane.getByRole('heading', { level: 3, name: section }),
        ).toBeVisible();
    }
    await expectNoHorizontalOverflow(page);
    await expectNoBlockingA11yViolations(page);
    await page.screenshot({
      path: info.outputPath(`design-system-${info.project.name}.png`),
      fullPage: true,
    });
  });

  test('keeps an open overlay accessible and in its pane theme', async ({
    page,
  }) => {
    await page.goto(GALLERY);
    const dark = page.getByRole('region', { name: 'Dark theme' });
    await dark
      .getByRole('button', { name: /Replay speed/ })
      .first()
      .click();
    const listbox = page.getByRole('listbox');
    await expect(listbox).toBeVisible();
    await expect(listbox.getByRole('option')).toHaveCount(3);
    expect(
      await listbox.evaluate((el) =>
        el.closest('[data-scheme]')?.getAttribute('data-scheme'),
      ),
    ).toBe('dark');
    await expectNoBlockingA11yViolations(page);
    await page.keyboard.press('Escape');
    await expect(listbox).toBeHidden();
  });

  test('applies a relative date preset and echoes it in UTC', async ({
    page,
  }) => {
    await page.goto(GALLERY);
    const light = page.getByRole('region', { name: 'Light theme' });
    await light
      .getByRole('group', { name: /Audit window/ })
      .first()
      .getByRole('button', { name: /calendar/i })
      .click();
    await page.getByRole('button', { name: 'Last 15 minutes' }).click();
    await expect(light.getByText(/UTC$/).first()).toBeVisible();
  });
});
