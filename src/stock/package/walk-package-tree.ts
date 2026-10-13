import { readInChunks } from 'src/shared/utils/read-in-chunks.util';
import { stockPackages } from 'src/stock/package/package-records';

type PackageLink = 'parentPackageId' | 'packageDestId';
type LinkedRow = { id: string } & Partial<Record<PackageLink, string | null>>;

// Packages nest a few levels deep; a walk stops here should the data hold a loop.
const MAX_DEPTH = 100;

// The packages, then every package they point to through the `up` links, up to
// the top; then every package pointing through the `down` links to any found
// package, down to the bottom. The selection must name the links it follows.
export const walkPackageTree = async <TRow extends LinkedRow>({
  startIds,
  up,
  down,
  selection,
}: {
  startIds: string[];
  up: PackageLink[];
  down: PackageLink[];
  selection: string;
}) => {
  const found = new Map<string, TRow>();
  let frontier = [...new Set(startIds)];

  for (let depth = 0; frontier.length > 0 && depth < MAX_DEPTH; depth += 1) {
    const rows = await readInChunks(frontier, (part) => stockPackages.find<TRow>({ id: { in: part } }, selection));

    rows.forEach((row) => found.set(row.id, row));
    frontier = [...new Set(rows.flatMap((row) => up.flatMap((link) => row[link] ?? [])))].filter((id) => !found.has(id));
  }
  let level = down.length === 0 ? [] : [...found.keys()];

  for (let depth = 0; level.length > 0 && depth < MAX_DEPTH; depth += 1) {
    const rows = (
      await readInChunks(level, (part) =>
        stockPackages.find<TRow>({ or: down.map((link) => ({ [link]: { in: part } })) }, selection),
      )
    ).filter((row) => !found.has(row.id));

    rows.forEach((row) => found.set(row.id, row));
    level = rows.map((row) => row.id);
  }
  return found;
};
