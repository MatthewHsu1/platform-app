import { stockPackages } from 'src/stock/package/package-records';
import { stockQuants } from 'src/stock/stock-records';
import { planKeptContainers } from 'src/stock/utils/plan-package-rules.util';

type PackageLink = { id: string; parentPackageId: string | null; packageDestId: string | null };

const SELECTION = 'id parentPackageId packageDestId';
// Packages nest a few levels deep; a walk stops here should the data hold a loop.
const MAX_DEPTH = 100;

// The packages of the rows, every container above them, and every package
// inside those containers.
const readTrees = async (packageIds: string[]) => {
  const found = new Map<string, PackageLink>();
  let frontier = [...new Set(packageIds)];

  for (let depth = 0; frontier.length > 0 && depth < MAX_DEPTH; depth += 1) {
    const rows = await stockPackages.find<PackageLink>({ id: { in: frontier } }, SELECTION);

    rows.forEach((row) => found.set(row.id, row));
    frontier = [...new Set(rows.flatMap((row) => row.parentPackageId ?? []))].filter((id) => !found.has(id));
  }
  let level = [...found.keys()];

  for (let depth = 0; level.length > 0 && depth < MAX_DEPTH; depth += 1) {
    const children = (await stockPackages.find<PackageLink>({ parentPackageId: { in: level } }, SELECTION)).filter(
      (child) => !found.has(child.id),
    );

    children.forEach((child) => found.set(child.id, child));
    level = children.map((child) => child.id);
  }
  return found;
};

// Which moved packages keep their containers, as destination containers the
// done moves then apply.
export const planContainersToKeep = async (
  quants: { id: string; packageId: string | null }[],
  limitIds: string[],
): Promise<{ packageId: string; packageDestId: string }[]> => {
  const packageIds = [...new Set(quants.flatMap((quant) => quant.packageId ?? []))];

  if (packageIds.length === 0) {
    return [];
  }
  const packages = await readTrees(packageIds);
  const contentQuants = await stockQuants.find<{ id: string; packageId: string | null }>(
    { packageId: { in: [...packages.keys()] }, or: [{ quantity: { neq: 0 } }, { reservedQuantity: { neq: 0 } }] },
    'id packageId',
  );
  const kept = planKeptContainers({ movedQuants: quants, packages: [...packages.values()], contentQuants, limitIds });

  return [...kept.entries()]
    .filter(([packageId, packageDestId]) => packages.get(packageId)?.packageDestId !== packageDestId)
    .map(([packageId, packageDestId]) => ({ packageId, packageDestId }));
};

export const writeContainersToKeep = async (plan: { packageId: string; packageDestId: string }[]) => {
  for (const { packageId, packageDestId } of plan) {
    await stockPackages.update(packageId, { packageDestId });
  }
};
