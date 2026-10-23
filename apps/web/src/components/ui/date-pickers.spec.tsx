import {
  type DateValue,
  getLocalTimeZone,
  parseDate,
  parseZonedDateTime,
  toZoned,
} from '@internationalized/date';
import type { Locale } from '@matchiq/contracts';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import type { InstantRange } from '@/lib/date-time';
import { DatePicker, DateTimePicker } from './date-picker';
import { DateRangePicker } from './date-range-picker';

const KICK_OFF = parseDate('2026-10-24');

const openPicker = async (name: RegExp) => {
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name }));
  return { user, dialog: screen.getByRole('dialog') };
};

describe('DatePicker', () => {
  it.each([
    ['en-GB', 'October 2026'],
    ['fr-FR', 'octobre 2026'],
    ['es-ES', 'octubre de 2026'],
    ['pcm-NG', 'October 2026'],
  ] as const)('formats the calendar for %s', async (locale, month) => {
    render(
      <DatePicker
        label="Kick-off"
        value={KICK_OFF}
        onChange={vi.fn()}
        locale={locale as Locale}
      />,
    );
    const { dialog } = await openPicker(/Kick-off/);
    expect(within(dialog).getByRole('heading')).toHaveTextContent(month);
  });

  it('summarises the value instead of showing editable segments', () => {
    render(<DatePicker label="Kick-off" value={KICK_OFF} onChange={vi.fn()} />);
    expect(
      screen.getByRole('button', { name: /Kick-off.*Sat, 24 Oct 2026/ }),
    ).toBeVisible();
    expect(screen.queryAllByRole('spinbutton')).toHaveLength(0);
  });

  it('shows a placeholder, not a mask, when empty', () => {
    render(<DatePicker label="Kick-off" value={null} onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: /Pick a date/ })).toBeVisible();
    expect(screen.queryByText(/dd|yyyy/)).not.toBeInTheDocument();
  });

  it('picks a day and closes', async () => {
    const onChange = vi.fn();
    render(
      <DatePicker label="Kick-off" value={KICK_OFF} onChange={onChange} />,
    );
    const { user, dialog } = await openPicker(/Kick-off/);
    const grid = within(dialog).getByRole('grid');
    await user.click(within(grid).getByText('27'));
    expect(onChange).toHaveBeenCalledWith(parseDate('2026-10-27'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('keeps exact typed entry, ordered day, month, year', async () => {
    const onChange = vi.fn();
    render(
      <DatePicker label="Kick-off" value={KICK_OFF} onChange={onChange} />,
    );
    const { user, dialog } = await openPicker(/Kick-off/);
    await user.click(
      within(dialog).getByRole('button', { name: 'Type a date' }),
    );
    const segments = within(dialog).getAllByRole('spinbutton');
    expect(segments.map((s) => s.textContent)).toEqual(['24', '10', '2026']);
    await user.click(segments[0] as HTMLElement);
    await user.keyboard('{ArrowUp}');
    expect(onChange).toHaveBeenCalledWith(parseDate('2026-10-25'));
  });

  it('clears the value', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <DatePicker label="Kick-off" value={KICK_OFF} onChange={onChange} />,
    );
    await user.click(screen.getByRole('button', { name: 'Clear dates' }));
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('shows a validation message tied to the field', () => {
    render(
      <DatePicker
        label="Kick-off"
        value={KICK_OFF}
        onChange={vi.fn()}
        errorMessage="Choose a date before the match ends."
      />,
    );
    expect(
      screen.getByRole('button', { name: /Kick-off/ }),
    ).toHaveAccessibleDescription('Choose a date before the match ends.');
  });

  it('marks match days with a described dot', async () => {
    render(
      <DatePicker
        label="Kick-off"
        value={KICK_OFF}
        onChange={vi.fn()}
        markedDates={[parseDate('2026-10-31')]}
      />,
    );
    const { dialog } = await openPicker(/Kick-off/);
    const cell = within(within(dialog).getByRole('grid')).getByText('31');
    expect(cell.closest('[role=button]')).toHaveAccessibleDescription(
      'Match day',
    );
  });
});

describe('DateTimePicker', () => {
  const KICK_OFF_TIME = parseZonedDateTime('2026-10-24T15:00[Africa/Lagos]');

  it('summarises to the minute, without seconds or a zone', () => {
    render(
      <DateTimePicker
        label="Kick-off time"
        value={KICK_OFF_TIME}
        onChange={vi.fn()}
        granularity="second"
      />,
    );
    expect(
      screen.getByRole('button', { name: /Sat 24 Oct, 15:00$/ }),
    ).toBeVisible();
  });

  it('steps the time by a quarter hour and names the zone once', async () => {
    const onChange = vi.fn<(v: DateValue | null) => void>();
    render(
      <DateTimePicker
        label="Kick-off time"
        value={KICK_OFF_TIME}
        onChange={onChange}
      />,
    );
    const { user, dialog } = await openPicker(/Kick-off time/);
    await user.click(
      within(dialog).getByRole('button', { name: 'Time: 15 minutes later' }),
    );
    expect(onChange.mock.calls[0]?.[0]?.toString()).toBe(
      '2026-10-24T15:15:00+01:00[Africa/Lagos]',
    );
    expect(
      within(dialog).getByText(/^Shown in your local time \(/),
    ).toBeVisible();
    expect(within(dialog).queryByText(/server|in UTC/)).not.toBeInTheDocument();
  });
});

function ControlledRange(props: {
  onChange: (v: InstantRange | null) => void;
}) {
  const [value, setValue] = useState<InstantRange | null>(null);
  return (
    <DateRangePicker
      label="Window"
      value={value}
      onChange={(v) => {
        setValue(v);
        props.onChange(v);
      }}
      presets={['last15m', 'thisMatch']}
    />
  );
}

describe('DateRangePicker', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-23T14:30:00Z'));
  });
  afterEach(() => vi.useRealTimers());

  it('applies a relative preset as a UTC window, closes and names it', async () => {
    const onChange = vi.fn();
    render(<ControlledRange onChange={onChange} />);
    expect(
      screen.getByRole('button', { name: /Window.*Any time/ }),
    ).toBeVisible();
    const { user } = await openPicker(/Window/);
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
    expect(
      screen.getByRole('button', { name: /Window.*Last 15 minutes/ }),
    ).toBeVisible();
    await user.click(screen.getByRole('button', { name: /Window/ }));
    expect(
      screen.getByRole('button', { name: 'Last 15 minutes' }),
    ).toHaveAttribute('aria-pressed', 'true');
  });

  it('only commits calendar days on Apply, in local time', async () => {
    const onChange = vi.fn();
    render(<ControlledRange onChange={onChange} />);
    const { user, dialog } = await openPicker(/Window/);
    const grid = within(dialog).getAllByRole('grid')[0] as HTMLElement;
    await user.click(within(grid).getByText('12'));
    await user.click(within(grid).getByText('14'));
    expect(onChange).not.toHaveBeenCalled();
    await user.click(within(dialog).getByRole('button', { name: 'Apply' }));
    const zone = getLocalTimeZone();
    expect(onChange).toHaveBeenCalledWith({
      start: toZoned(parseDate('2026-10-12'), zone).toDate().toISOString(),
      end: toZoned(parseDate('2026-10-14'), zone)
        .set({ hour: 23, minute: 59 })
        .toDate()
        .toISOString(),
    });
  });

  it('cancels without changing the value', async () => {
    const onChange = vi.fn();
    render(<ControlledRange onChange={onChange} />);
    const { user, dialog } = await openPicker(/Window/);
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('summarises a same-day window in plain words', () => {
    const zone = getLocalTimeZone();
    const start = parseZonedDateTime(`2026-10-23T14:00[${zone}]`);
    render(
      <DateRangePicker
        label="Window"
        value={{
          start: start.toDate().toISOString(),
          end: start.add({ minutes: 90 }).toDate().toISOString(),
        }}
        onChange={vi.fn()}
      />,
    );
    expect(
      screen.getByRole('button', { name: /Window.*Today, 14:00–15:30/ }),
    ).toBeVisible();
    expect(screen.queryByText(/UTC/)).not.toBeInTheDocument();
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
