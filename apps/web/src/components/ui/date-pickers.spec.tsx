import { parseDate } from '@internationalized/date';
import type { Locale } from '@matchiq/contracts';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DatePicker } from './date-picker';
import { DateRangePicker } from './date-range-picker';

const KICK_OFF = parseDate('2026-10-24');

const openCalendar = async (locale: Locale) => {
  const user = userEvent.setup();
  render(
    <DatePicker
      label="Kick-off"
      value={KICK_OFF}
      onChange={vi.fn()}
      locale={locale}
    />,
  );
  await user.click(screen.getByRole('button', { name: /calendar/i }));
  return screen.getByRole('dialog');
};

describe('DatePicker', () => {
  it.each([
    ['en-GB', 'October 2026'],
    ['fr-FR', 'octobre 2026'],
    ['es-ES', 'octubre de 2026'],
    ['pcm-NG', 'October 2026'],
  ] as const)('formats the calendar for %s', async (locale, month) => {
    const dialog = await openCalendar(locale);
    expect(within(dialog).getByRole('heading')).toHaveTextContent(month);
  });

  it('orders segments day, month, year for British English', () => {
    render(<DatePicker label="Kick-off" value={KICK_OFF} onChange={vi.fn()} />);
    const segments = screen
      .getAllByRole('spinbutton')
      .map((s) => s.textContent);
    expect(segments).toEqual(['24', '10', '2026']);
  });

  it('edits a segment with the arrow keys', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <DatePicker label="Kick-off" value={KICK_OFF} onChange={onChange} />,
    );
    const [day] = screen.getAllByRole('spinbutton');
    await user.click(day as HTMLElement);
    await user.keyboard('{ArrowUp}');
    expect(onChange).toHaveBeenCalledWith(parseDate('2026-10-25'));
  });

  it('shows a validation message', () => {
    render(
      <DatePicker
        label="Kick-off"
        value={KICK_OFF}
        onChange={vi.fn()}
        errorMessage="Choose a date before the match ends."
      />,
    );
    expect(
      screen.getByText('Choose a date before the match ends.'),
    ).toBeVisible();
  });
});

describe('DateRangePicker', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-23T14:30:00Z'));
  });
  afterEach(() => vi.useRealTimers());

  it('applies a relative preset as a UTC window and closes', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <DateRangePicker
        label="Window"
        value={null}
        onChange={onChange}
        presets={['last15m', 'thisMatch']}
      />,
    );
    await user.click(screen.getByRole('button', { name: /calendar/i }));
    const presets = screen.getByRole('group', { name: 'Quick ranges' });
    expect(
      within(presets).getByRole('button', { name: 'This match' }),
    ).toBeDisabled();
    await user.click(
      within(presets).getByRole('button', { name: 'Last 15 minutes' }),
    );
    expect(onChange).toHaveBeenCalledWith({
      start: '2026-10-23T14:15:00.000Z',
      end: '2026-10-23T14:30:00.000Z',
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('states the time zone and echoes the window in UTC', () => {
    render(
      <DateRangePicker
        label="Window"
        value={{
          start: '2026-10-23T12:00:00.000Z',
          end: '2026-10-23T13:45:00.000Z',
        }}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByText(/sent to the server in UTC/)).toBeVisible();
    expect(
      screen.getByText('2026-10-23 12:00:00 → 2026-10-23 13:45:00 UTC'),
    ).toBeVisible();
  });

  it('clears the window', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <DateRangePicker
        label="Window"
        value={{ start: '2026-10-23T12:00:00Z', end: '2026-10-23T13:45:00Z' }}
        onChange={onChange}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Clear dates' }));
    expect(onChange).toHaveBeenCalledWith(null);
  });
});
