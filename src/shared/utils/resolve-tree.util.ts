export type TreeRow = { id: string; parentId: string | null };

export const resolveTree = <TRow extends TreeRow>(rows: TRow[]) => {
  const byId = new Map(rows.map((row) => [row.id, row]));
  const chains = new Map<string, TRow[]>();
  const cycles: string[] = [];

  for (const row of rows) {
    const chain: TRow[] = [];
    const seen = new Set<string>();
    let current: TRow | undefined = row;
    let isCyclic = false;

    while (current !== undefined) {
      if (seen.has(current.id)) {
        isCyclic = true;
        break;
      }
      seen.add(current.id);
      chain.unshift(current);
      current = current.parentId === null ? undefined : byId.get(current.parentId);
    }

    if (isCyclic) {
      cycles.push(row.id);
    } else {
      chains.set(row.id, chain);
    }
  }

  return { chains, cycles };
};
