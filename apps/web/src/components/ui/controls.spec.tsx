import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { Button } from './button';
import { Checkbox } from './checkbox';
import { Disclosure } from './disclosure';
import { HintBadge } from './hint-badge';
import { Menu } from './menu';
import { ActionButton } from './action-button';
import { RadioCards } from './radio-cards';
import { SegmentedControl } from './segmented-control';
import { Switch } from './switch';
import { Tooltip } from './tooltip';

describe('Tooltip', () => {
  it('opens on keyboard focus, describes the trigger and closes on Escape', async () => {
    const user = userEvent.setup();
    render(
      <Tooltip content="Starts a fresh session">
        <Button>Restart</Button>
      </Tooltip>,
    );
    await user.tab();
    const tip = await screen.findByRole('tooltip');
    expect(tip).toHaveTextContent('Starts a fresh session');
    expect(
      screen.getByRole('button', { name: 'Restart' }),
    ).toHaveAccessibleDescription('Starts a fresh session');
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('gives a hint badge a name that includes its hint', () => {
    render(<HintBadge hint="May change">Provisional</HintBadge>);
    expect(
      screen.getByRole('button', { name: 'Provisional: May change' }),
    ).toBeInTheDocument();
  });
});

describe('Disclosure', () => {
  it('toggles with a real button and aria-expanded', async () => {
    const user = userEvent.setup();
    render(
      <Disclosure title="View as table">
        <p>Rows</p>
      </Disclosure>,
    );
    const trigger = screen.getByRole('button', { name: 'View as table' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByText('Rows')).not.toBeVisible();
    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Rows')).toBeVisible();
  });
});

describe('Menu', () => {
  it('runs an action chosen from the keyboard', async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    render(
      <Menu
        label="Session actions"
        trigger={<ActionButton>Actions</ActionButton>}
        actions={[
          { id: 'open', label: 'Open studio' },
          { id: 'copy', label: 'Copy link' },
          { id: 'purge', label: 'Delete', isDisabled: true },
        ]}
        onAction={onAction}
      />,
    );
    act(() => screen.getByRole('button', { name: 'Actions' }).focus());
    await user.keyboard('{Enter}');
    expect(await screen.findByRole('menu')).toBeInTheDocument();
    await user.keyboard('{ArrowDown}{Enter}');
    expect(onAction).toHaveBeenCalledWith('copy');
  });
});

describe('SegmentedControl', () => {
  function Speed() {
    const [value, setValue] = useState(1);
    return (
      <SegmentedControl
        legend="Speed"
        options={[
          { value: 1, label: '1×' },
          { value: 5, label: '5×' },
          { value: 30, label: '30×' },
        ]}
        value={value}
        onChange={setValue}
      />
    );
  }

  it('moves and selects with the arrow keys, like native radios', async () => {
    const user = userEvent.setup();
    render(<Speed />);
    expect(
      screen.getByRole('radiogroup', { name: 'Speed' }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: '1×' }));
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('radio', { name: '5×' })).toBeChecked();
  });
});

describe('Switch, Checkbox and RadioCards', () => {
  it('toggles a switch with Space', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <Switch isSelected={false} onChange={onChange}>
        Auto-publish
      </Switch>,
    );
    await user.tab();
    await user.keyboard(' ');
    expect(onChange).toHaveBeenCalledWith(true);
    expect(
      screen.getByRole('switch', { name: 'Auto-publish' }),
    ).not.toBeChecked();
  });

  it('links a checkbox error to the control', () => {
    render(
      <Checkbox
        isSelected={false}
        onChange={vi.fn()}
        errorMessage="Confirm first."
      >
        Show simulated failures
      </Checkbox>,
    );
    const box = screen.getByRole('checkbox', {
      name: 'Show simulated failures',
    });
    expect(box).toHaveAccessibleDescription('Confirm first.');
    expect(box).toBeInvalid();
  });

  it('selects a radio card and skips one with a disabled reason', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <RadioCards
        label="Speed"
        value="1"
        onChange={onChange}
        options={[
          { id: '1', label: 'Real time', description: 'About 90 minutes.' },
          { id: '30', label: 'Highlights', disabledReason: 'Producers only.' },
        ]}
      />,
    );
    expect(screen.getByRole('radio', { name: /Highlights/ })).toBeDisabled();
    await user.click(screen.getByRole('radio', { name: /Real time/ }));
    expect(screen.getByRole('radio', { name: /Real time/ })).toBeChecked();
  });
});
