import { type LocationTreeRow } from 'src/fieldservice/types/location-tree-row.type';
import { completeDirection, completeName } from 'src/fieldservice/utils/complete-names.util';
import { resolveTree } from 'src/shared/utils/resolve-tree.util';

type LocationNames = { id: string; completeName: string; completeDirection: string | null };

// The full name and full directions of every location, built down from its root. A location in a loop of
// parents gets none until the loop is undone. Only the rows whose stored values differ are returned.
export const planLocationNames = (rows: LocationTreeRow[]): LocationNames[] => {
  const { chains } = resolveTree(rows);
  const names: LocationNames[] = [];

  for (const row of rows) {
    const chain = chains.get(row.id);

    if (chain === undefined) {
      continue;
    }
    let name: string | null = null;
    let direction: string | null = null;

    for (const link of chain) {
      name = completeName(name, link.ref, link.name ?? '');
      direction = completeDirection(direction, link.direction);
    }
    if (name !== null && (name !== row.completeName || direction !== row.completeDirection)) {
      names.push({ id: row.id, completeName: name, completeDirection: direction });
    }
  }
  return names;
};
