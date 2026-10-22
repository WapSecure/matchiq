import { withUniqueKeys } from './unique-keys';

describe('withUniqueKeys', () => {
  it('keeps distinct keys and suffixes repeats by occurrence', () => {
    const keys = withUniqueKeys(['a', 'b', 'a', 'a'], (s) => s).map(
      (k) => k.key,
    );
    expect(keys).toEqual(['a', 'b', 'a#1', 'a#2']);
  });
});
