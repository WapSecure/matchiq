import { existsSync } from 'node:fs';
import { join } from 'node:path';
import manifest from './manifest';

const PUBLIC_DIR = join(import.meta.dirname, '../../public');

describe('web app manifest', () => {
  const m = manifest();

  it('launches standalone into the fixture lobby', () => {
    expect(m).toMatchObject({
      name: 'MatchIQ',
      short_name: 'MatchIQ',
      display: 'standalone',
      start_url: '/fixtures',
      scope: '/',
      background_color: '#080a0e',
      theme_color: '#080a0e',
    });
    expect(m.description).toMatch(/synthetic/i);
    expect(m.shortcuts?.[0]).toMatchObject({ url: '/fixtures' });
  });

  it('ships 192 and 512 icons plus a maskable 512, all present in public/', () => {
    const icons = m.icons ?? [];
    expect(icons.map((i) => `${i.sizes}:${i.purpose ?? 'any'}`)).toEqual(
      expect.arrayContaining([
        '192x192:any',
        '512x512:any',
        '512x512:maskable',
      ]),
    );
    for (const icon of icons) {
      expect(existsSync(join(PUBLIC_DIR, icon.src))).toBe(true);
    }
  });
});
