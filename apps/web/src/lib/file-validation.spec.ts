import { checkFiles, formatBytes, matchesAccept } from './file-validation';

const KB = 1024;
const RULES = {
  accept: ['application/json', '.csv', 'image/*'],
  acceptLabel: 'JSON, CSV or an image',
  maxBytes: 100 * KB,
};

const file = (name: string, type: string, bytes = 10) =>
  new File(['x'.repeat(bytes)], name, { type });

describe('formatBytes', () => {
  it('uses the largest whole unit', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(2 * KB)).toBe('2 KB');
    expect(formatBytes(1.5 * KB * KB)).toBe('1.5 MB');
  });
});

describe('matchesAccept', () => {
  it('matches exact types, wildcards and extensions', () => {
    expect(
      matchesAccept({ name: 'a.json', type: 'application/json' }, RULES.accept),
    ).toBe(true);
    expect(matchesAccept({ name: 'A.CSV', type: '' }, RULES.accept)).toBe(true);
    expect(
      matchesAccept({ name: 'logo.png', type: 'image/png' }, RULES.accept),
    ).toBe(true);
    expect(
      matchesAccept({ name: 'notes.txt', type: 'text/plain' }, RULES.accept),
    ).toBe(false);
    expect(matchesAccept({ name: 'x', type: 'imagery/x' }, ['image/*'])).toBe(
      false,
    );
  });

  it('accepts anything when no rule is given', () => {
    expect(matchesAccept({ name: 'x.bin', type: '' }, [])).toBe(true);
  });
});

describe('checkFiles', () => {
  it('keeps valid files and explains each rejection in plain language', () => {
    const result = checkFiles(
      [
        file('fixtures.json', 'application/json'),
        file('notes.txt', 'text/plain'),
        file('huge.csv', 'text/csv', 200 * KB),
      ],
      RULES,
    );
    expect(result.accepted.map((f) => f.name)).toEqual(['fixtures.json']);
    expect(result.rejected).toEqual([
      {
        name: 'notes.txt',
        reason: 'notes.txt is not a supported file. Use JSON, CSV or an image.',
      },
      {
        name: 'huge.csv',
        reason: 'huge.csv is larger than 100 KB. Choose a smaller file.',
      },
    ]);
  });

  it('caps the number of files', () => {
    const result = checkFiles(
      [file('a.csv', 'text/csv'), file('b.csv', 'text/csv')],
      { ...RULES, maxFiles: 1 },
    );
    expect(result.accepted).toHaveLength(1);
    expect(result.rejected[0]?.reason).toBe(
      'You can add up to 1 file at a time.',
    );
  });
});
