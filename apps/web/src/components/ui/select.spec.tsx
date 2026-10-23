import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { Combobox } from './combobox';
import type { ChoiceOption, ChoiceSection } from './option-item';
import { Select } from './select';

const SPEEDS: ChoiceOption[] = [
  { id: '1', label: 'Real time', description: 'About 90 minutes.' },
  { id: '5', label: 'Brisk', description: 'About 18 minutes.' },
  { id: '30', label: 'Highlights', disabledReason: 'Needs a producer role.' },
];

const ROLES: ChoiceSection[] = [
  { title: 'Editorial', options: [{ id: 'producer', label: 'Producer' }] },
  { title: 'Platform', options: [{ id: 'operator', label: 'Operator' }] },
];

function SpeedSelect({
  onChange = vi.fn(),
}: {
  onChange?: (v: string) => void;
}) {
  const [value, setValue] = useState<string | null>('1');
  return (
    <Select
      label="Replay speed"
      value={value}
      onChange={(v) => {
        setValue(v);
        onChange(v);
      }}
      options={SPEEDS}
    />
  );
}

describe('Select', () => {
  it('opens from the keyboard, moves with arrows and selects with Enter', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<SpeedSelect onChange={onChange} />);
    const trigger = screen.getByRole('button', { name: /Replay speed/ });
    expect(trigger).toHaveTextContent('Real time');
    act(() => trigger.focus());
    await user.keyboard('{ArrowDown}');
    const listbox = await screen.findByRole('listbox');
    expect(within(listbox).getAllByRole('option')).toHaveLength(3);
    await user.keyboard('{ArrowDown}{Enter}');
    expect(onChange).toHaveBeenCalledWith('5');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(trigger).toHaveTextContent('Brisk');
  });

  it('shows descriptions and keeps a disabled option, with its reason, unselectable', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<SpeedSelect onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: /Replay speed/ }));
    const highlights = screen.getByRole('option', { name: /Highlights/ });
    expect(highlights).toHaveAttribute('aria-disabled', 'true');
    expect(highlights).toHaveTextContent('Needs a producer role.');
    expect(screen.getByRole('option', { name: /Brisk/ })).toHaveAccessibleName(
      /^Brisk,\s?About 18 minutes\.$/,
    );
    await user.click(highlights);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('keeps the closed field to the label unless asked to describe it', () => {
    const { rerender } = render(
      <Select label="Speed" value="1" onChange={vi.fn()} options={SPEEDS} />,
    );
    const trigger = screen.getByRole('button', { name: /Speed/ });
    expect(trigger).toHaveTextContent('Real time');
    expect(trigger).not.toHaveTextContent('About 90 minutes.');
    rerender(
      <Select
        label="Speed"
        value="1"
        onChange={vi.fn()}
        options={SPEEDS}
        showDescriptionInTrigger
      />,
    );
    expect(trigger).toHaveTextContent('About 90 minutes.');
  });

  it('groups options under headings', async () => {
    const user = userEvent.setup();
    render(
      <Select label="Role" value={null} onChange={vi.fn()} sections={ROLES} />,
    );
    await user.click(screen.getByRole('button', { name: /Role/ }));
    const groups = screen.getAllByRole('group');
    expect(groups).toHaveLength(2);
    expect(
      within(groups[0] as HTMLElement).getByRole('option'),
    ).toHaveTextContent('Producer');
  });

  it('marks itself invalid and shows the message', () => {
    render(
      <Select
        label="Role"
        value={null}
        onChange={vi.fn()}
        sections={ROLES}
        errorMessage="Choose a role to continue."
      />,
    );
    expect(screen.getByText('Choose a role to continue.')).toBeVisible();
    expect(screen.getByRole('button', { name: /Role/ })).toHaveTextContent(
      'Choose an option',
    );
  });

  it('is disabled while loading', () => {
    render(
      <Select
        label="Role"
        value={null}
        onChange={vi.fn()}
        sections={ROLES}
        isLoading
      />,
    );
    expect(screen.getByRole('button', { name: /Role/ })).toBeDisabled();
  });
});

describe('Combobox', () => {
  const TEAMS: ChoiceOption[] = [
    { id: 'nb', label: 'Northbridge Athletic' },
    { id: 'hr', label: 'Harbourside Rovers' },
    { id: 'np', label: 'Northport Albion' },
  ];

  it('filters as you type and selects with the keyboard', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <Combobox
        label="Team"
        value={null}
        onChange={onChange}
        options={TEAMS}
      />,
    );
    const input = screen.getByRole('combobox', { name: 'Team' });
    await user.type(input, 'north');
    const options = within(screen.getByRole('listbox')).getAllByRole('option');
    expect(options.map((o) => o.textContent)).toEqual([
      'Northbridge Athletic',
      'Northport Albion',
    ]);
    await user.keyboard('{ArrowDown}{Enter}');
    expect(onChange).toHaveBeenCalledWith('nb');
  });

  it('says so when nothing matches', async () => {
    const user = userEvent.setup();
    render(
      <Combobox label="Team" value={null} onChange={vi.fn()} options={TEAMS} />,
    );
    await user.type(screen.getByRole('combobox', { name: 'Team' }), 'zzz');
    expect(
      await screen.findByText('No matches. Try a different word.'),
    ).toBeVisible();
  });
});
