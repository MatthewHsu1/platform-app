// Walks a move chain level by level from the start moves, the start moves
// first; ids already in `seen` stop the walk.
export const rollupMoves = (startIds: string[], next: (id: string) => string[], seen: Set<string> = new Set()) => {
  const order: string[] = [];
  let level = startIds;

  while (level.length > 0) {
    const unseen = [...new Set(level)].filter((id) => !seen.has(id));

    if (unseen.length === 0) {
      break;
    }
    for (const id of unseen) {
      seen.add(id);
      order.push(id);
    }
    level = unseen.flatMap(next);
  }

  return order;
};
