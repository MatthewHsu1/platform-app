import { stockPackages } from 'src/stock/package/package-records';
import { readStockProducts } from 'src/stock/product/read-stock-products';
import { putawayDestinations } from 'src/stock/putaway/apply-putaway';
import { stockMoveLines, stockMoves } from 'src/stock/stock-records';
import { readStockSettings } from 'src/stock/stock-settings';
import { readResolvedUoms } from 'src/stock/stock-uoms';
import { lineQuantityInProductUnit } from 'src/stock/utils/line-quantity-in-product-unit.util';
import { outermostPackage } from 'src/stock/utils/plan-put-in-pack.util';
import { type PutawayRequest } from 'src/stock/putaway/types/putaway-request.type';
import { type PutawayStrategyLine } from 'src/stock/putaway/types/putaway-strategy-line.type';
import { type PutawayStrategyStore } from 'src/stock/putaway/types/putaway-strategy-store.type';

// Lines that already exist get the place the putaway rules choose under their
// move's destination, grouped by the outermost package they go into: a typed
// package is placed as a whole; the lines of an untyped package are placed one
// by one, and go back to their move's destination when they would not stay
// together; loose lines are placed one by one.
export const makeApplyPutawayStrategy = (store: PutawayStrategyStore) => async (lineIds: string[]): Promise<void> => {
  if (lineIds.length === 0) {
    return;
  }
  const lines = await store.readLines(lineIds);
  const units = await store.readUnits([...new Set(lines.map((line) => line.productId))]);
  const moves = await store.readMoves([...new Set(lines.flatMap((line) => line.moveId ?? []))]);
  const moveById = new Map(moves.map((move) => [move.id, move]));
  const headed = await store.readHeadedPackages();
  const outermostOf = (line: PutawayStrategyLine) =>
    line.resultPackageId === null ? null : outermostPackage(line.resultPackageId, headed);
  const groups = new Map<string | null, PutawayStrategyLine[]>();

  for (const line of lines) {
    const key = outermostOf(line);
    groups.set(key, [...(groups.get(key) ?? []), line]);
  }
  const packageTypes = await store.readPackageTypes([...groups.keys()].flatMap((key) => key ?? []));
  const moveOf = (line: PutawayStrategyLine) => (line.moveId === null ? undefined : moveById.get(line.moveId));
  const baseOf = (line: PutawayStrategyLine) => moveOf(line)?.locationDestId ?? line.locationDestId;
  // A line still to place is left out of what the locations hold; a placed one counts where it now goes.
  const lineRequests = (group: PutawayStrategyLine[], packagingUomOf: (line: PutawayStrategyLine) => string | null): PutawayRequest[] =>
    group.map((line, index) => ({
      key: line.id,
      locationDestId: baseOf(line),
      productId: line.productId,
      quantity: lineQuantityInProductUnit({
        line,
        productUomId: units.productUomIds.get(line.productId) ?? null,
        uoms: units.uoms,
        digits: units.digits,
      }),
      packageId: null,
      packagingUomId: packagingUomOf(line),
      excludedLineIds: group.slice(index).map((later) => later.id),
    }));
  const wanted = new Map<string, string>();

  for (const [packageId, group] of groups) {
    const groupIds = group.map((line) => line.id);

    if (packageId !== null && (packageTypes.get(packageId) ?? null) !== null) {
      const key = `package:${packageId}`;
      const destinations = await store.putawayDestinations([
        {
          key,
          locationDestId: baseOf(group[0]),
          productId: group[0].productId,
          productIds: [...new Set(group.map((line) => line.productId))],
          quantity: 0,
          packageId,
          packagingUomId: null,
          excludedLineIds: groupIds,
        },
      ]);
      const destination = destinations.get(key);

      group.forEach((line) => wanted.set(line.id, destination ?? line.locationDestId));
    } else if (packageId !== null) {
      const destinations = await store.putawayDestinations(lineRequests(group, () => null));
      const places = new Set(group.map((line) => destinations.get(line.id) ?? line.locationDestId));

      group.forEach((line) => wanted.set(line.id, places.size > 1 ? baseOf(line) : (destinations.get(line.id) ?? line.locationDestId)));
    } else {
      const destinations = await store.putawayDestinations(lineRequests(group, (line) => moveOf(line)?.packagingUomId ?? null));

      group.forEach((line) => wanted.set(line.id, destinations.get(line.id) ?? line.locationDestId));
    }
  }

  const byDestination = new Map<string, string[]>();

  for (const line of lines) {
    const destination = wanted.get(line.id);

    if (destination !== undefined && destination !== line.locationDestId) {
      byDestination.set(destination, [...(byDestination.get(destination) ?? []), line.id]);
    }
  }
  for (const [destination, ids] of byDestination) {
    await store.writeDestination(ids, destination);
  }
};

// The app writes the places it computed.
export const applyPutawayStrategy = makeApplyPutawayStrategy({
  readLines: (lineIds) =>
    stockMoveLines.find<PutawayStrategyLine>(
      { id: { in: lineIds } },
      'id moveId productId quantity productUomId quantityProductUom locationDestId resultPackageId',
    ),
  readUnits: async (productIds) => {
    const [products, uoms] = await Promise.all([readStockProducts(productIds), readResolvedUoms()]);

    return {
      productUomIds: new Map([...products].map(([productId, product]) => [productId, product.uomId])),
      uoms,
      digits: readStockSettings().productUnitDigits,
    };
  },
  readMoves: (moveIds) =>
    stockMoves.find<{ id: string; locationDestId: string | null; packagingUomId: string | null }>(
      { id: { in: moveIds } },
      'id locationDestId packagingUomId',
    ),
  readHeadedPackages: () =>
    stockPackages.find<{ id: string; packageDestId: string | null }>({ packageDestId: { is: 'NOT_NULL' } }, 'id packageDestId'),
  readPackageTypes: async (packageIds) =>
    new Map(
      (await stockPackages.find<{ id: string; packageTypeId: string | null }>({ id: { in: packageIds } }, 'id packageTypeId')).map(
        (pack) => [pack.id, pack.packageTypeId],
      ),
    ),
  putawayDestinations,
  writeDestination: (lineIds, locationDestId) => stockMoveLines.updateMany(lineIds, { locationDestId }),
});
