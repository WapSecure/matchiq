import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { Button } from './button';
import { ButtonLink } from './button-link';
import { Checkbox } from './checkbox';
import { RadioCards } from './radio-cards';
import { SegmentedControl } from './segmented-control';
import { Switch } from './switch';

const OUTLINE = /(^|\s)(group-)?(data-)?focus-visible:outline-2(\s|$)/;
const OUTLINE_COLOUR =
  /(^|\s)(group-)?(data-)?focus-visible:outline-accent(\s|$)/;

const NOOP = () => undefined;

const PRIMITIVES: ReadonlyArray<[string, ReactElement]> = [
  ['button', <Button key="b">Save</Button>],
  [
    'link',
    <ButtonLink key="l" href="#top">
      Top
    </ButtonLink>,
  ],
  [
    'checkbox',
    <Checkbox key="c" isSelected={false} onChange={NOOP}>
      Notify me
    </Checkbox>,
  ],
  [
    'switch',
    <Switch key="s" isSelected={false} onChange={NOOP}>
      Auto-publish
    </Switch>,
  ],
  [
    'radio',
    <RadioCards
      key="r"
      label="Speed"
      value="1"
      onChange={NOOP}
      options={[{ id: '1', label: 'Real time' }]}
    />,
  ],
  [
    'segment',
    <SegmentedControl
      key="g"
      legend="Pace"
      options={[{ value: 1, label: 'Slow' }]}
      value={1}
      onChange={NOOP}
    />,
  ],
];

const classesWithin = (root: HTMLElement): string[] =>
  Array.from(root.querySelectorAll('*')).map(
    (e) => e.getAttribute('class') ?? '',
  );

describe('visible focus indicator on interactive primitives', () => {
  it.each(PRIMITIVES)(
    'defines a 2px accent outline for the %s when focused by keyboard',
    async (_name, element) => {
      const user = userEvent.setup();
      const { container } = render(element);
      await user.tab();

      const classes = classesWithin(container);
      expect(classes.some((c) => OUTLINE.test(c))).toBe(true);
      expect(classes.some((c) => OUTLINE_COLOUR.test(c))).toBe(true);
      expect(document.activeElement).not.toBe(document.body);
    },
  );

  it('marks the focused control as keyboard-focused so the outline applies', async () => {
    const user = userEvent.setup();
    render(
      <Switch isSelected={false} onChange={NOOP}>
        Auto-publish
      </Switch>,
    );
    expect(
      screen.getByRole('switch').closest('[data-focus-visible]'),
    ).toBeNull();
    await user.tab();
    expect(
      screen.getByRole('switch').closest('[data-focus-visible="true"]'),
    ).not.toBeNull();
  });
});
