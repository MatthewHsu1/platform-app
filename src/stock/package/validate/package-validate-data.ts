import { readInChunks } from 'src/shared/utils/read-in-chunks.util';
import { readLocations } from 'src/stock/location/read-locations';
import { walkPackageTree } from 'src/stock/package/walk-package-tree';
import { stockQuants } from 'src/stock/stock-records';
import { type PackageNode } from 'src/stock/utils/types/package-node.type';

type PackageRead = Omit<PackageNode, 'name' | 'completeName'> & { name: string | null; completeName: string | null };

// Reads turn an empty text into null, so a package without a full name falls back to its name.
const toNode = (row: PackageRead): PackageNode => ({
  ...row,
  name: row.name ?? '',
  completeName: row.completeName ?? row.name ?? '',
});

// The packages the lines touch with every container above them (the one they
// are in and the one they are headed into), then every package inside or
// headed into any of those.
export const readPackageNodes = async (packageIds: string[]) => {
  const rows = await walkPackageTree<PackageRead>({
    startIds: packageIds,
    up: ['parentPackageId', 'packageDestId'],
    down: ['parentPackageId', 'packageDestId'],
    selection: 'id name completeName parentPackageId packageDestId locationId',
  });

  return new Map([...rows.values()].map((row) => [row.id, toNode(row)]));
};

// The package trees, their rows with stock, oldest first, and the names of the
// places those rows and the lines' destinations are in.
export const readPackageValidateData = async (packageIds: string[], extraLocationIds: string[] = []) => {
  const nodes = await readPackageNodes(packageIds);
  const packageQuants = (
    await readInChunks([...nodes.keys()], (part) =>
      stockQuants.find<{ id: string; packageId: string; locationId: string; quantity: number; createdAt: string }>(
        { packageId: { in: part }, quantity: { neq: 0 } },
        'id packageId locationId quantity createdAt',
      ),
    )
  ).sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id));
  const locations = await readLocations([...packageQuants.map((quant) => quant.locationId), ...extraLocationIds]);

  return {
    nodes,
    packageQuants: packageQuants.map((quant) => ({ packageId: quant.packageId, locationId: quant.locationId, quantity: quant.quantity })),
    locationNames: new Map([...locations.values()].map((location) => [location.id, location.completeName ?? location.name ?? ''])),
  };
};
