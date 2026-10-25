import { describe, expect, it } from 'vitest';
import { fixture } from '@/test/factories';
import { buildRoster } from './roster';

describe('buildRoster', () => {
  it('names both sides so a comparison never falls back to Home and Away', () => {
    const f = fixture();
    expect(buildRoster(f).sideNames).toEqual({
      home: f.home.name,
      away: f.away.name,
    });
  });

  it('has no side names before the fixture loads', () => {
    expect(buildRoster(undefined).sideNames).toEqual({});
  });
});
