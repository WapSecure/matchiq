import {
  checksumOf,
  matchCode,
  matchCodeSlug,
  parseSessionId,
} from './match-code';

const SEEDED = [
  [
    'PEN',
    'MAR',
    'a9f052c3269591b3895aaf920984c253b233715d9cbb2ed972f68fd5dd7c310c',
  ],
  [
    'KIN',
    'NOR',
    '09e36e761a82036fea2f2817bc5a510f6810b9f5a30b5865bc4c16a4db0563e1',
  ],
  [
    'GLE',
    'QUA',
    '1b82c4c9f4956b638190062880dc3ff99912197fcc37f1aab7fcde63ca437d7a',
  ],
  [
    'ELM',
    'TAR',
    '9c0e2f1b9801a71328a2fd890fcee37f90370fb9c21c83f63961bc70b475f67b',
  ],
  [
    'BRA',
    'TAR',
    '75daa5cca013b0f041d4f5875a459876805b116b5a0adee0ba86dbb595632a7b',
  ],
] as const;

const codes = () => SEEDED.map(([h, a, x]) => matchCode(h, a, x));

describe('match code', () => {
  it('gives the documented code for each seeded fixture', () => {
    expect(codes()).toEqual([
      'PEN-MAR · N7R5',
      'KIN-NOR · 17HP',
      'GLE-QUA · 3E1C',
      'ELM-TAR · KG72',
      'BRA-TAR · EQDA',
    ]);
  });

  it('is deterministic and unique across the seeded fixtures', () => {
    expect(codes()).toEqual(codes());
    expect(new Set(codes()).size).toBe(SEEDED.length);
    expect(new Set(SEEDED.map(([, , x]) => checksumOf(x))).size).toBe(
      SEEDED.length,
    );
  });

  it('uses four unambiguous uppercase characters', () => {
    for (let i = 1; i <= 500; i++) {
      const hash = ((i * 2654435761) >>> 0).toString(16).padStart(64, 'f');
      expect(checksumOf(hash)).toMatch(/^[0-9A-HJKMNP-TV-Z]{4}$/);
    }
  });

  it('covers the first 20 bits and ignores the rest', () => {
    expect(checksumOf(`00000${'a'.repeat(59)}`)).toBe('0000');
    expect(checksumOf(`fffff${'0'.repeat(59)}`)).toBe('ZZZZ');
    expect(checksumOf(`12345${'a'.repeat(59)}`)).toBe(
      checksumOf(`12345${'b'.repeat(59)}`),
    );
  });

  it('rarely collides across many distinct hashes', () => {
    const total = 300;
    const seen = new Set<string>();
    for (let i = 1; i <= total; i++) {
      const head = ((i * 0x9e3779b1) >>> 0).toString(16).padStart(8, '0');
      seen.add(checksumOf(head + 'c'.repeat(56)));
    }
    expect(total - seen.size).toBeLessThanOrEqual(3);
  });

  it('upper-cases team codes and survives non-hex input', () => {
    expect(matchCode('pen', 'mar', 'zzzz')).toMatch(/^PEN-MAR · [0-9A-Z]{4}$/);
    expect(checksumOf('not a hash')).toBe(checksumOf('not a hash'));
  });

  it('parses session ids and builds download-safe slugs', () => {
    expect(parseSessionId('fx_comeback_42_s5')).toEqual({
      templateId: 'fx_comeback_42',
      replay: 5,
    });
    expect(parseSessionId('fx_comeback_42')).toEqual({
      templateId: 'fx_comeback_42',
      replay: null,
    });
    expect(matchCodeSlug('PEN-MAR · 7K3F')).toBe('PEN-MAR-7K3F');
  });
});
