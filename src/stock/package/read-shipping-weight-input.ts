import { readInChunks } from 'src/shared/utils/read-in-chunks.util';
import { walkPackageTree } from 'src/stock/package/walk-package-tree';
import { productProducts, stockMoveLines, stockPickings } from 'src/stock/stock-records';
import { planShippingWeight, planShippingWeightWrite } from 'src/stock/utils/plan-shipping-weight.util';

type WeightPackageRead = {
  id: string;
  packageDestId: string | null;
  shippingWeight: number | null;
  packageType: { baseWeight: number | null } | null;
};

// The packages with every container they are headed into, then every package
// headed into those: what the outermost packages weigh.
export const readWeightPackages = async (resultPackageIds: string[]) => {
  const found = await walkPackageTree<WeightPackageRead>({
    startIds: resultPackageIds,
    up: ['packageDestId'],
    down: ['packageDestId'],
    selection: 'id packageDestId shippingWeight packageType { baseWeight }',
  });

  return [...found.values()].map((pack) => ({
    id: pack.id,
    packageDestId: pack.packageDestId,
    baseWeight: pack.packageType?.baseWeight ?? 0,
    shippingWeight: pack.shippingWeight ?? 0,
  }));
};

// The shipping weight part of the transfer's derived values: one patch per
// transfer whose computed weight moved.
export const shippingWeightPatches = async (pickingIds: string[]) => {
  const patches = new Map<string, Record<string, unknown>>();
  const ids = [...new Set(pickingIds)];

  if (ids.length === 0) {
    return patches;
  }
  const [stored, lines] = await Promise.all([
    stockPickings.find<{ id: string; shippingWeight: number | null; shippingWeightComputed: number | null }>(
      { id: { in: ids } },
      'id shippingWeight shippingWeightComputed',
    ),
    stockMoveLines.find<{ pickingId: string; productId: string; resultPackageId: string | null; quantity: number; quantityProductUom: number | null }>(
      { pickingId: { in: ids } },
      'pickingId productId resultPackageId quantity quantityProductUom',
    ),
  ]);
  const [products, packages] = await Promise.all([
    readInChunks([...new Set(lines.map((line) => line.productId))], (part) =>
      productProducts.find<{ id: string; weight: number | null }>({ id: { in: part } }, 'id weight'),
    ),
    readWeightPackages(lines.flatMap((line) => line.resultPackageId ?? [])),
  ]);
  const weightOf = new Map(products.map((product) => [product.id, product.weight ?? 0]));

  for (const picking of stored) {
    const computed = planShippingWeight({
      lines: lines
        .filter((line) => line.pickingId === picking.id)
        .map((line) => ({
          resultPackageId: line.resultPackageId,
          quantityProductUom: line.quantityProductUom ?? line.quantity,
          productWeight: weightOf.get(line.productId) ?? 0,
        })),
      packages,
    });
    const patch = planShippingWeightWrite({
      computed,
      storedComputed: picking.shippingWeightComputed,
      storedShippingWeight: picking.shippingWeight,
    });

    if (Object.keys(patch).length > 0) {
      patches.set(picking.id, patch);
    }
  }
  return patches;
};

type WeighingStore = {
  readTreeIds: (packageIds: string[]) => Promise<string[]>;
  // Every line going into these packages, whatever its state.
  readLinesInto: (packageIds: string[]) => Promise<{ pickingId: string | null }[]>;
};

// The transfers whose weight depends on these packages: those with lines going
// into any package of their destination trees. A done transfer is weighed
// again too; its weight is kept like any other derived value.
export const makePickingsWeighingPackages = (store: WeighingStore) => async (packageIds: string[]) => {
  if (packageIds.length === 0) {
    return [];
  }
  const lines = await store.readLinesInto(await store.readTreeIds(packageIds));

  return [...new Set(lines.flatMap((line) => line.pickingId ?? []))];
};

export const pickingsWeighingPackages = makePickingsWeighingPackages({
  readTreeIds: async (packageIds) => (await readWeightPackages(packageIds)).map((pack) => pack.id),
  readLinesInto: (packageIds) =>
    readInChunks(packageIds, (part) => stockMoveLines.find<{ pickingId: string | null }>({ resultPackageId: { in: part } }, 'pickingId')),
});
