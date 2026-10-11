// How many items each key has.
export const countBy = <TItem>(items: readonly TItem[], key: (item: TItem) => string) => {
  const counts = new Map<string, number>();

  for (const item of items) {
    const itemKey = key(item);

    counts.set(itemKey, (counts.get(itemKey) ?? 0) + 1);
  }
  return counts;
};
