import { stockPackages } from 'src/stock/package/package-records';
import { errorCollector } from 'src/shared/triggers/retry-on-conflict';
import { PACKAGE_RECURSION_REASON, planPackageSubtree } from 'src/stock/utils/plan-package-tree.util';

type StoredPackage = {
  id: string;
  name: string | null;
  parentPackageId: string | null;
  completeName: string | null;
  parentPath: string | null;
};

type PackageTreeStore = {
  readPackage: (packageId: string) => Promise<StoredPackage | undefined>;
  readChildren: (parentIds: string[]) => Promise<StoredPackage[]>;
  update: (packageId: string, data: { completeName: string; parentPath: string }) => Promise<void>;
};

const SELECTION = 'id name parentPackageId completeName parentPath';
// Packages nest a few levels deep; a walk this long can only be a loop in the data.
export const MAX_PACKAGE_DEPTH = 100;

export const makePackageNames = (store: PackageTreeStore) => {
  // The containers are walked through the stored container links rather than
  // their stored paths, which another trigger run may not have rewritten yet. A
  // container met twice, or a chain that never ends, is a loop.
  const readContainerChain = async (root: StoredPackage) => {
    const chain: StoredPackage[] = [];
    const seen = new Set<string>([root.id]);
    let containerId = root.parentPackageId;

    while (containerId !== null) {
      if (chain.length >= MAX_PACKAGE_DEPTH) {
        return { chain, loop: true };
      }
      const container = await store.readPackage(containerId);

      if (container === undefined) {
        break;
      }
      chain.unshift(container);
      if (seen.has(container.id)) {
        return { chain, loop: true };
      }
      seen.add(container.id);
      containerId = container.parentPackageId;
    }
    return { chain, loop: false };
  };

  const readContainedPackages = async (rootId: string) => {
    const found: StoredPackage[] = [];
    const seen = new Set<string>([rootId]);
    let level = [rootId];

    for (let depth = 0; level.length > 0 && depth < MAX_PACKAGE_DEPTH; depth += 1) {
      const children = (await store.readChildren(level)).filter((child) => !seen.has(child.id));

      children.forEach((child) => seen.add(child.id));
      found.push(...children);
      level = children.map((child) => child.id);
    }
    return found;
  };

  // The stored package, its containers and the packages inside it, with the
  // full names and paths they should carry.
  const readPackageSubtree = async (packageId: string) => {
    const root = await store.readPackage(packageId);

    if (root === undefined) {
      return null;
    }
    const { chain: containers, loop } = await readContainerChain(root);
    const descendants = await readContainedPackages(root.id);

    if (loop) {
      return { root, rows: [root, ...descendants], plan: { cycle: true, values: new Map<string, { completeName: string; parentPath: string }>() } };
    }
    const plan = planPackageSubtree({
    root: { id: root.id, name: root.name ?? '', parentPackageId: root.parentPackageId },
    parent:
      containers.length === 0
        ? null
        : {
            id: containers[containers.length - 1].id,
            completeName: containers.map((container) => container.name ?? '').join(' > '),
            parentPath: containers.map((container) => `${container.id}/`).join(''),
          },
      descendants: descendants.map((row) => ({ id: row.id, name: row.name ?? '', parentPackageId: row.parentPackageId })),
    });

    return { root, rows: [root, ...descendants], plan };
  };

  const writePackageSubtree = async ({ rows, plan }: NonNullable<Awaited<ReturnType<typeof readPackageSubtree>>>) => {
    for (const row of rows) {
      const next = plan.values.get(row.id);

      if (next !== undefined && (next.completeName !== (row.completeName ?? '') || next.parentPath !== (row.parentPath ?? ''))) {
        await store.update(row.id, next);
      }
    }
  };

  // Full name and path of each package and of every package inside it.
  const rebuildPackageNames = async (packageIds: string[]) => {
    const errors = errorCollector();

    for (const packageId of [...new Set(packageIds)]) {
      await errors.run(packageId, async () => {
        const subtree = await readPackageSubtree(packageId);

        if (subtree === null) {
          return;
        }
        if (subtree.plan.cycle) {
          throw new Error(PACKAGE_RECURSION_REASON);
        }
        await writePackageSubtree(subtree);
      });
    }
    errors.throwIfAny();
  };

  return { readPackageSubtree, writePackageSubtree, rebuildPackageNames };
};

export const { readPackageSubtree, writePackageSubtree, rebuildPackageNames } = makePackageNames({
  readPackage: async (packageId) => (await stockPackages.find<StoredPackage>({ id: { eq: packageId } }, SELECTION))[0],
  readChildren: (parentIds) => stockPackages.find<StoredPackage>({ parentPackageId: { in: parentIds } }, SELECTION),
  update: (packageId, data) => stockPackages.update(packageId, data),
});
