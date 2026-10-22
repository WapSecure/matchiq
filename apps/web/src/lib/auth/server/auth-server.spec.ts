// @vitest-environment node
import { safeReturnTo } from './redirects';
import { chunk, seal, unseal } from './seal';

const SECRET = 's'.repeat(40);

describe('session sealing', () => {
  it('round-trips a payload that the browser cannot read', async () => {
    const sealed = await seal({ accessToken: 'secret-token' }, SECRET, 60);
    expect(sealed).not.toContain('secret-token');
    expect(await unseal(sealed, SECRET)).toMatchObject({
      accessToken: 'secret-token',
    });
  });

  it('rejects a payload sealed with another secret or altered', async () => {
    const sealed = await seal({ a: 1 }, SECRET, 60);
    expect(await unseal(sealed, 'o'.repeat(40))).toBeNull();
    expect(await unseal(`${sealed.slice(0, -4)}AAAA`, SECRET)).toBeNull();
  });

  it('splits long values into ordered chunks', () => {
    expect(chunk('abcdefg', 3)).toEqual(['abc', 'def', 'g']);
    expect(chunk('', 3)).toEqual([]);
  });
});

describe('safeReturnTo', () => {
  it.each([
    ['/studio/fx_1', '/studio/fx_1'],
    ['/fixtures?x=1', '/fixtures?x=1'],
    ['//evil.example', '/fixtures'],
    ['/\\evil.example', '/fixtures'],
    ['https://evil.example', '/fixtures'],
    [null, '/fixtures'],
  ])('maps %s to %s', (input, expected) => {
    expect(safeReturnTo(input)).toBe(expected);
  });
});
