/**
 * Pairs each item with a React key that is unique within the list. Repeats of
 * the same base key get an occurrence suffix, so keys stay stable as the list
 * grows instead of shifting like array indexes.
 */
export const withUniqueKeys = <T>(
  items: readonly T[],
  keyOf: (item: T) => string,
): { item: T; key: string }[] => {
  const seen = new Map<string, number>();
  return items.map((item) => {
    const base = keyOf(item);
    const n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    return { item, key: n === 0 ? base : `${base}#${n}` };
  });
};
