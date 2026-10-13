import { readLocations } from 'src/stock/location/read-locations';
import { recomputeMove } from 'src/stock/move/recompute-move';
import { recomputePickingState } from 'src/stock/picking/recompute-picking-state';
import { readStockProducts } from 'src/stock/product/read-stock-products';
import { putawayDestinations } from 'src/stock/putaway/apply-putaway';
import { cutBackOverReservation } from 'src/stock/quant/cut-back-over-reservation';
import { parseQuantKey, quantKey, sourceKeyOf } from 'src/stock/quant/quant-key';
import { recomputeReserved } from 'src/stock/quant/recompute-reserved';
import { readRemovalMethods, withRemovalRefusal } from 'src/stock/removal/read-removal-methods';
import { pickRemovalStrategy, planLeastPackages, removalOrder } from 'src/stock/removal/removal-order';
import { REMOVAL_METHOD } from 'src/stock/routing-options.constant';
import { stockLocations, stockMoveLines, stockMoves, stockQuants } from 'src/stock/stock-records';
import { LOCATION_ROW, MOVE_LINE_ROW, MOVE_ROW, QUANT_ROW } from 'src/stock/stock-rows';
import { nowIso, readStockSettings } from 'src/stock/stock-settings';
import { readResolvedUoms } from 'src/stock/stock-uoms';
import { bypassesReservation } from 'src/stock/utils/location-usage.util';
import { planSetQuantity } from 'src/stock/utils/plan-set-quantity.util';
import { convertQuantity } from 'src/stock/utils/stock-uom.util';
import { type LocationRow } from 'src/stock/types/location-row.type';
import { type MoveLineRow } from 'src/stock/types/move-line-row.type';
import { type MoveRow } from 'src/stock/types/move-row.type';
import { type QuantRow } from 'src/stock/types/quant-row.type';

export const setMoveQuantity = async (moveId: string, quantity: number) => {
  const [move] = await stockMoves.find<MoveRow>({ id: { eq: moveId } }, MOVE_ROW);

  if (move === undefined || move.locationId === null || move.locationDestId === null) {
    return;
  }
  const { productUnitDigits: digits } = readStockSettings();
  const [lines, products, uoms, locations] = await Promise.all([
    stockMoveLines.find<MoveLineRow>({ moveId: { eq: moveId } }, MOVE_LINE_ROW),
    readStockProducts([move.productId]),
    readResolvedUoms(),
    readLocations([move.locationId]),
  ]);
  const product = products.get(move.productId);
  const source = locations.get(move.locationId);

  if (product === undefined || source === undefined) {
    return;
  }
  const moveUomId = move.productUomId ?? product.uomId;
  const bypass = bypassesReservation(source.usage) || !product.isStorable;
  // A source without a path has no known sub-locations: nothing is reserved, as in assign-moves.
  const subtree =
    bypass || source.parentPath === null
      ? []
      : await stockLocations.find<LocationRow>({ parentPath: { like: `${source.parentPath}%` } }, LOCATION_ROW);
  const quants =
    subtree.length === 0
      ? []
      : await stockQuants.find<
          QuantRow & { createdAt: string; removalDate: string | null; package: { createdAt: string } | null }
        >(
          { productId: { eq: move.productId }, locationId: { in: subtree.map((row) => row.id) } },
          `${QUANT_ROW} createdAt removalDate package { createdAt }`,
        );
  const completeNameById = new Map(subtree.map((row) => [row.id, row.completeName]));
  const keyOf = (quant: QuantRow) =>
    quant.quantKey ??
    quantKey({ productId: quant.productId, locationId: quant.locationId, lotId: quant.lotId, packageId: quant.packageId, ownerId: quant.ownerId });
  // With no stock to take (a source that is not reserved from, or none on hand)
  // there is nothing to order, so the removal strategy is never asked for.
  const orderForRemoval = async () => {
    if (quants.length === 0) {
      return [];
    }
    const removal = await readRemovalMethods({
      categoryIds: product.categId === null ? [] : [product.categId],
      parentPaths: [source.parentPath],
    });
    const method = pickRemovalStrategy(removal.categoryMethodOf(product.categId), removal.chainOf(source.parentPath));
    const removable = quants.map((quant) => ({
      ...quant,
      locationCompleteName: completeNameById.get(quant.locationId) ?? null,
      packageCreatedAt: quant.package?.createdAt ?? null,
    }));
    const wanted = convertQuantity({ qty: quantity, fromUomId: moveUomId, toUomId: product.uomId, uoms, digits, round: false });

    return withRemovalRefusal(() =>
      removalOrder(method === REMOVAL_METHOD.LEAST_PACKAGES ? planLeastPackages(removable, wanted) : removable, method),
    );
  };
  const ordered = await orderForRemoval();
  const plan = planSetQuantity({
    target: quantity,
    moveUomId,
    productUomId: product.uomId,
    moveLocationId: move.locationId,
    bypassReservation: bypass,
    lines: lines.map((line) => ({
      id: line.id,
      quantity: line.quantity,
      productUomId: line.productUomId ?? product.uomId,
      key: sourceKeyOf(line),
      createdAt: line.createdAt,
    })),
    freeByKey: new Map(quants.map((quant) => [keyOf(quant), quant.quantity - quant.reservedQuantity])),
    quants: ordered
      .filter((quant) => quant.quantity - quant.reservedQuantity > 0)
      .map((quant) => ({
        key: keyOf(quant),
        locationId: quant.locationId,
        ownerId: quant.ownerId,
        free: quant.quantity - quant.reservedQuantity,
      })),
    uoms,
    digits,
    tracking: product.tracking,
  });
  const inProductUnit = (qty: number, fromUomId: string) =>
    convertQuantity({ qty, fromUomId, toUomId: product.uomId, uoms, digits, method: 'HALF-UP' });
  const lineById = new Map(lines.map((line) => [line.id, line]));

  for (const update of plan.update) {
    const line = lineById.get(update.lineId);
    await stockMoveLines.update(update.lineId, {
      quantity: update.quantity,
      quantityProductUom: inProductUnit(update.quantity, line?.productUomId ?? product.uomId),
    });
  }
  await stockMoveLines.destroyMany(plan.destroy);

  const destinations = await putawayDestinations(
    plan.create.map((row, index) => ({
      key: String(index),
      locationDestId: move.locationDestId ?? '',
      productId: move.productId,
      quantity: inProductUnit(row.quantity, row.productUomId),
      packageId: null,
      packagingUomId: move.packagingUomId,
    })),
  );
  const created = plan.create.map((row, index) => ({
    moveId: move.id,
    pickingId: move.pickingId,
    productId: move.productId,
    productUomId: row.productUomId,
    quantity: row.quantity,
    quantityProductUom: inProductUnit(row.quantity, row.productUomId),
    locationId: row.locationId,
    locationDestId: destinations.get(String(index)) ?? move.locationDestId,
    ownerId: row.ownerId,
    lotId: row.quantKey === null ? null : parseQuantKey(row.quantKey).lotId,
    packageId: row.quantKey === null ? null : parseQuantKey(row.quantKey).packageId,
    state: move.state,
    picked: move.picked,
    date: nowIso(),
  }));

  await stockMoveLines.createMany(created);

  const touchedKeys = [
    ...new Set([
      ...lines.map((line) => sourceKeyOf(line)),
      ...created.map((line) => sourceKeyOf({ ...line, locationDestId: line.locationDestId ?? null })),
    ]),
  ];

  if (product.isStorable && !bypassesReservation(source.usage)) {
    await recomputeReserved(touchedKeys);
  }
  const { changedMoveIds } =
    product.isStorable && !bypassesReservation(source.usage) ? await cutBackOverReservation(touchedKeys) : { changedMoveIds: [] };

  await recomputeMove([...new Set([move.id, ...changedMoveIds])]);
  if (move.pickingId !== null) {
    await recomputePickingState([move.pickingId]);
  }
};
