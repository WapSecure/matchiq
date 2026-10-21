import { type CliIo, runGenerate, runValidate } from '../src/cli/commands.js';
import { serializeFixtureFile, generateFixtureFile } from '../src/index.js';

const fakeIo = (files: Record<string, string> = {}) => {
  const out: string[] = [];
  const err: string[] = [];
  const io: CliIo = {
    out: (line) => out.push(line),
    err: (line) => err.push(line),
    readFile: async (path) => {
      const content = files[path];
      if (content === undefined) throw new Error('ENOENT');
      return content;
    },
    writeFile: async (path, content) => {
      files[path] = content;
    },
  };
  return { io, out, err, files };
};

describe('generate:fixture', () => {
  it('writes a valid fixture file and reports its manifest', async () => {
    const { io, out, files } = fakeIo();
    const code = await runGenerate(
      ['--seed', '42', '--scenario', 'comeback', '--out', 'x.json'],
      io,
    );
    expect(code).toBe(0);
    const expected = serializeFixtureFile(
      generateFixtureFile({ seed: 42, scenario: 'comeback' }),
    );
    expect(files['x.json']).toBe(expected);
    expect(out[0]).toMatch(
      /^wrote x\.json: \d+ events, score 3-2, sha256 [0-9a-f]{64}$/,
    );
  });

  it('prints to stdout without --out and honours --kickoff', async () => {
    const { io, out } = fakeIo();
    const args = [
      '--seed',
      '1',
      '--scenario',
      'low-event',
      '--kickoff',
      '2026-10-25T12:30:00Z',
    ];
    expect(await runGenerate(args, io)).toBe(0);
    const parsed = JSON.parse(out.join('\n')) as {
      fixture: { kickoffUtc: string };
    };
    expect(parsed.fixture.kickoffUtc).toBe('2026-10-25T12:30:00Z');
  });

  it.each([
    [['--scenario', 'comeback']],
    [['--seed', '-1', '--scenario', 'comeback']],
    [['--seed', '1.5', '--scenario', 'comeback']],
    [['--seed', '1', '--scenario', 'derby']],
    [['--seed', '1', '--scenario', 'comeback', '--kickoff', 'tomorrow']],
    [['--seed', '1', '--scenario', 'comeback', '--colour', 'red']],
  ])('exits 2 with usage for %j', async (args) => {
    const { io, err } = fakeIo();
    expect(await runGenerate(args, io)).toBe(2);
    expect(err.at(-1)).toMatch(/^usage:/);
  });
});

describe('validate:fixture', () => {
  const valid = serializeFixtureFile(
    generateFixtureFile({ seed: 3, scenario: 'high-press' }),
  );

  it('exits 0 for valid files', async () => {
    const { io, out } = fakeIo({ 'a.json': valid });
    expect(await runValidate(['a.json'], io)).toBe(0);
    expect(out[0]).toMatch(/^OK a\.json: \d+ events/);
  });

  it('exits 1 and lists issues for invalid or unreadable files', async () => {
    const tampered = valid.replace('"sequence": 7,', '"sequence": 70,');
    const { io, err } = fakeIo({
      'a.json': valid,
      'b.json': tampered,
      'c.json': '{',
    });
    expect(
      await runValidate(['a.json', 'b.json', 'c.json', 'missing.json'], io),
    ).toBe(1);
    expect(err.join('\n')).toMatch(/INVALID b\.json/);
    expect(err.join('\n')).toMatch(/SEQUENCE_GAP #70/);
    expect(err.join('\n')).toMatch(/cannot read c\.json/);
    expect(err.join('\n')).toMatch(/cannot read missing\.json/);
  });

  it('exits 2 without arguments', async () => {
    const { io } = fakeIo();
    expect(await runValidate([], io)).toBe(2);
  });
});
