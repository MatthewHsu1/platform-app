const compareText = (left: string, right: string) => (left < right ? -1 : left > right ? 1 : 0);

// Ids in the order their rows were made (creation time, then id), as a list of
// linked records reads; unknown ids go last in their given order.
export const orderByCreation = (ids: string[], rows: { id: string; createdAt: string }[]) => {
  const createdAt = new Map(rows.map((row) => [row.id, row.createdAt]));
  const known = ids.filter((id) => createdAt.has(id));

  return [
    ...known.sort((left, right) => compareText(createdAt.get(left) ?? '', createdAt.get(right) ?? '') || compareText(left, right)),
    ...ids.filter((id) => !createdAt.has(id)),
  ];
};
