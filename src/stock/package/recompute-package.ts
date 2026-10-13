import { stockPackages } from 'src/stock/package/package-records';
import { stockQuants } from 'src/stock/stock-records';
import { planPackageLocations } from 'src/stock/utils/plan-package-rules.util';

type PackageRow = { id: string; name: string | null; parentPackageId: string | null; locationId: string | null };
type PositiveQuant = { id: string; packageId: string; locationId: string; createdAt: string };

type RecomputePackageStore = {
  readPackages: (ids: string[]) => Promise<PackageRow[]>;
  readChildren: (parentIds: string[]) => Promise<PackageRow[]>;
  // Rows holding more than zero, of these packages.
  readPositiveQuants: (packageIds: string[]) => Promise<PositiveQuant[]>;
  writeLocation: (packageId: string, locationId: string | null) => Promise<void>;
};

const SELECTION = 'id name parentPackageId locationId';
// Packages nest a few levels deep; the climb stops here should the data hold a loop.
const MAX_DEPTH = 100;

// The one writer of a package's location: the packages asked and their
// containers up to the top, each placed from its own stock, else from the
// package it holds first. A contained package outside that chain keeps the
// place it shows.
export const makeRecomputePackage = (store: RecomputePackageStore) => async (packageIds: string[]) => {
  const rows = new Map<string, PackageRow>();
  let frontier = [...new Set(packageIds)];

  for (let depth = 0; frontier.length > 0 && depth < MAX_DEPTH; depth += 1) {
    const found = await store.readPackages(frontier);

    found.forEach((row) => rows.set(row.id, row));
    frontier = [...new Set(found.flatMap((row) => row.parentPackageId ?? []))].filter((id) => !rows.has(id));
  }
  if (rows.size === 0) {
    return;
  }
  const ids = [...rows.keys()];
  const children = (await store.readChildren(ids)).filter((child) => !rows.has(child.id));
  const positive = await store.readPositiveQuants(ids);
  const firstPositiveQuantLocation = new Map<string, string>();

  for (const quant of [...positive].sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id))) {
    if (!firstPositiveQuantLocation.has(quant.packageId)) {
      firstPositiveQuantLocation.set(quant.packageId, quant.locationId);
    }
  }
  const located = planPackageLocations({
    packages: [...rows.values(), ...children].map((row) => ({ id: row.id, name: row.name ?? '', parentPackageId: row.parentPackageId })),
    firstPositiveQuantLocation,
    knownLocations: new Map(children.map((child) => [child.id, child.locationId])),
  });

  for (const id of ids) {
    const location = located.get(id) ?? null;

    if (location !== (rows.get(id)?.locationId ?? null)) {
      await store.writeLocation(id, location);
    }
  }
};

export const recomputePackage = makeRecomputePackage({
  readPackages: (ids) => stockPackages.find<PackageRow>({ id: { in: ids } }, SELECTION),
  readChildren: (parentIds) => stockPackages.find<PackageRow>({ parentPackageId: { in: parentIds } }, SELECTION),
  readPositiveQuants: (packageIds) =>
    stockQuants.find<PositiveQuant>({ packageId: { in: packageIds }, quantity: { gt: 0 } }, 'id packageId locationId createdAt'),
  writeLocation: (packageId, locationId) => stockPackages.update(packageId, { locationId }),
});
