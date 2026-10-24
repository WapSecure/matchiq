import { act, render } from '@testing-library/react';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { REDUCED_MOTION_ATTRIBUTE } from '@/constants/preferences';
import { usePreferences } from './preferences-store';
import { PreferencesSync } from './preferences-sync';

const SRC = join(import.meta.dirname, '../..');
const GLOBAL_CSS = readFileSync(join(SRC, 'app/global.css'), 'utf8');
const OS_RULE =
  /@media \(prefers-reduced-motion: reduce\) \{([\s\S]*?\n {2}\})/;
const APP_RULE = /:root\[data-reduced-motion\][^{]*\{([^}]*)\}/;
const UNGATED_ANIMATION = /(?<!motion-safe:)\banimate-[a-z]/;
const STOPPED = [
  'animation-duration: 0.01ms !important',
  'animation-iteration-count: 1 !important',
  'transition-duration: 0.01ms !important',
  'scroll-behavior: auto !important',
];

const sourceFiles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.tsx$/.test(entry.name) && !entry.name.includes('.spec.')
      ? [path]
      : [];
  });

describe('reduced motion', () => {
  afterEach(() => {
    usePreferences.setState({ reducedMotion: false });
    document.documentElement.removeAttribute(REDUCED_MOTION_ATTRIBUTE);
  });

  it('stops animation and transitions when the OS asks for less motion', () => {
    const block = OS_RULE.exec(GLOBAL_CSS)?.[1] ?? '';
    for (const declaration of STOPPED) expect(block).toContain(declaration);
  });

  it('stops the same things for the in-app preference', () => {
    const block = APP_RULE.exec(GLOBAL_CSS)?.[1] ?? '';
    for (const declaration of STOPPED) expect(block).toContain(declaration);
  });

  it('marks the page when the viewer turns Reduce motion on and clears it when off', () => {
    render(<PreferencesSync />);
    const marked = () =>
      document.documentElement.hasAttribute(REDUCED_MOTION_ATTRIBUTE);
    expect(marked()).toBe(false);
    act(() => usePreferences.getState().setReducedMotion(true));
    expect(marked()).toBe(true);
    act(() => usePreferences.getState().setReducedMotion(false));
    expect(marked()).toBe(false);
  });

  it('only applies component animation utilities behind motion-safe', () => {
    const offenders = sourceFiles(SRC).filter((file) =>
      UNGATED_ANIMATION.test(readFileSync(file, 'utf8')),
    );
    expect(offenders).toEqual([]);
  });
});
