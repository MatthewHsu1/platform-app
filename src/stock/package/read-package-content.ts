import { readInChunks } from 'src/shared/utils/read-in-chunks.util';
import { walkPackageTree } from 'src/stock/package/walk-package-tree';
import { PACKAGE_USE } from 'src/stock/routing-options.constant';
import { stockQuants } from 'src/stock/stock-records';
import { type PackageContent } from 'src/stock/utils/types/package-content.type';

// The package and every package inside it, walked through the container links.
export const readPackageTreeIds = async (packageId: string) => {
  const tree = await walkPackageTree<{ id: string; parentPackageId: string | null }>({
    startIds: [packageId],
    up: [],
    down: ['parentPackageId'],
    selection: 'id parentPackageId',
  });

  return [...new Set([packageId, ...tree.keys()])];
};

// The rows with stock or a reservation in the package and in every package inside it.
export const readPackageContent = async (packageId: string) =>
  stockQuants.find<{ id: string; locationId: string; quantity: number; reservedQuantity: number }>(
    {
      packageId: { in: await readPackageTreeIds(packageId) },
      or: [{ quantity: { neq: 0 } }, { reservedQuantity: { neq: 0 } }],
    },
    'id locationId quantity reservedQuantity',
  );

type PackageNode = {
  id: string;
  parentPackageId: string | null;
  packageDestId: string | null;
  packageType: { packageUse: string | null } | null;
};

const PACKAGE_NODE = 'id parentPackageId packageDestId packageType { packageUse }';

// The packages with what deciding "moved whole" needs: their containers and
// destination containers up to the top (to head packages into a container),
// every package inside each of them, and the rows with stock or a
// reservation in each package and the packages inside it.
export const readPackageContents = async (packageIds: string[]) => {
  const nodes = await walkPackageTree<PackageNode>({
    startIds: packageIds,
    up: ['parentPackageId', 'packageDestId'],
    down: ['parentPackageId'],
    selection: PACKAGE_NODE,
  });
  const quants = await readInChunks([...nodes.keys()], (part) =>
    stockQuants.find<{ packageId: string; productId: string; lotId: string | null; quantity: number }>(
      { packageId: { in: part }, or: [{ quantity: { neq: 0 } }, { reservedQuantity: { neq: 0 } }] },
      'packageId productId lotId quantity',
    ),
  );
  const childrenOf = new Map<string, string[]>();

  for (const node of nodes.values()) {
    if (node.parentPackageId !== null) {
      childrenOf.set(node.parentPackageId, [...(childrenOf.get(node.parentPackageId) ?? []), node.id]);
    }
  }
  const descendantsOf = (packageId: string) => {
    const found = new Set<string>();
    let current = childrenOf.get(packageId) ?? [];

    while (current.length > 0) {
      current.forEach((id) => found.add(id));
      current = current.flatMap((id) => childrenOf.get(id) ?? []).filter((id) => !found.has(id) && id !== packageId);
    }
    return [...found];
  };
  const content = new Map<string, PackageContent>();

  for (const node of nodes.values()) {
    const descendantIds = descendantsOf(node.id);
    const inside = new Set([node.id, ...descendantIds]);

    content.set(node.id, {
      packageId: node.id,
      parentPackageId: node.parentPackageId,
      packageDestId: node.packageDestId,
      isReusable: node.packageType?.packageUse === PACKAGE_USE.REUSABLE,
      descendantIds,
      childIds: childrenOf.get(node.id) ?? [],
      quants: quants
        .filter((quant) => inside.has(quant.packageId))
        .map((quant) => ({ productId: quant.productId, lotId: quant.lotId, quantity: quant.quantity })),
    });
  }
  return content;
};
