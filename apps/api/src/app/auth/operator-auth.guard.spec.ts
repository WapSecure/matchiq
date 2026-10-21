import type { ExecutionContext } from '@nestjs/common';
import type { ApiEnv } from '@matchiq/config';
import { ProblemException } from '@matchiq/server-kit';
import { OperatorAuthGuard, operatorKeyMatches } from './operator-auth.guard';

const KEY = 'k'.repeat(40);

const contextWith = (authorization?: string): ExecutionContext =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({
        header: (name: string) =>
          name === 'authorization' ? authorization : undefined,
      }),
    }),
  }) as unknown as ExecutionContext;

const statusOf = (fn: () => unknown): number | undefined => {
  try {
    fn();
    return undefined;
  } catch (error) {
    return error instanceof ProblemException ? error.getStatus() : -1;
  }
};

describe('OperatorAuthGuard', () => {
  const guard = new OperatorAuthGuard({ OPERATOR_API_KEY: KEY } as ApiEnv);

  it('admits the configured bearer key', () => {
    expect(guard.canActivate(contextWith(`Bearer ${KEY}`))).toBe(true);
  });

  it.each([
    ['no header', undefined],
    ['another scheme', `Basic ${KEY}`],
    ['a wrong key', `Bearer ${'x'.repeat(40)}`],
    ['a prefix of the key', `Bearer ${KEY.slice(0, 10)}`],
    ['an empty token', 'Bearer '],
  ])('rejects %s with 401', (_label, header) => {
    expect(statusOf(() => guard.canActivate(contextWith(header)))).toBe(401);
  });

  it('compares keys of different lengths without throwing', () => {
    expect(operatorKeyMatches('short', KEY)).toBe(false);
    expect(operatorKeyMatches(KEY, KEY)).toBe(true);
  });
});
