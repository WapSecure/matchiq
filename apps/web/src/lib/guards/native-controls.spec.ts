// @vitest-environment node
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import {
  BANNED_INPUT_TYPE,
  INPUT_TAG,
  NATIVE_CONTROL_ALLOWLIST,
  NATIVE_TAG,
  SOURCE_FILE,
  TEST_FILE,
} from './native-controls.constants';

const SRC = join(import.meta.dirname, '../..');

const sourceFiles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return SOURCE_FILE.test(entry.name) && !TEST_FILE.test(entry.name)
      ? [path]
      : [];
  });

const usesNativeControl = (source: string): boolean =>
  NATIVE_TAG.test(source) ||
  (source.match(INPUT_TAG) ?? []).some((tag) => BANNED_INPUT_TYPE.test(tag));

describe('no browser-native controls (owner UX standard)', () => {
  const offenders = sourceFiles(SRC)
    .filter((file) => usesNativeControl(readFileSync(file, 'utf8')))
    .map((file) => relative(SRC, file))
    .sort();

  it('uses native select, dialog, date, file, checkbox, radio, range or colour inputs only in the allowlist', () => {
    const unexpected = offenders.filter(
      (f) => !(f in NATIVE_CONTROL_ALLOWLIST),
    );
    expect(unexpected).toEqual([]);
  });

  it('keeps the allowlist honest: every entry still needs its exception', () => {
    const stale = Object.keys(NATIVE_CONTROL_ALLOWLIST).filter(
      (f) => !offenders.includes(f),
    );
    expect(stale).toEqual([]);
  });

  it('recognises the forbidden patterns', () => {
    expect(usesNativeControl('<select value="a" />')).toBe(true);
    expect(usesNativeControl('<dialog open>')).toBe(true);
    expect(
      usesNativeControl('<input\n  onChange={() => go()}\n  type="date"\n/>'),
    ).toBe(true);
    expect(usesNativeControl('<input type="text" value="x" />')).toBe(false);
  });
});
