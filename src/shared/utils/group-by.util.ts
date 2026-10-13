// Items by key, each group in the order the items came.
export const groupBy = <TItem>(items: readonly TItem[], key: (item: TItem) => string) => {
  const groups = new Map<string, TItem[]>();

  for (const item of items) {
    const groupKey = key(item);
    const group = groups.get(groupKey);

    if (group === undefined) {
      groups.set(groupKey, [item]);
    } else {
      group.push(item);
    }
  }

  return groups;
};
