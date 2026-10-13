import { readLocations } from 'src/stock/location/read-locations';
import { readOriginAvailability } from 'src/stock/move/actions/read-origin-availability';
import { readMoveLinks } from 'src/stock/move/move-links';
import { recomputeMove } from 'src/stock/move/recompute-move';
import { checkEntirePack } from 'src/stock/package/check-entire-pack';
import { recomputePickingState } from 'src/stock/picking/recompute-picking-state';
import { readStockProducts } from 'src/stock/product/read-stock-products';
import { recomputeProductQuantities } from 'src/stock/product/recompute-product-quantities';
import { putawayDestinations } from 'src/stock/putaway/apply-putaway';
import { applyPutawayStrategy } from 'src/stock/putaway/apply-putaway-strategy';
import { cutBackOverReservation } from 'src/stock/quant/cut-back-over-reservation';
import { recomputeReserved } from 'src/stock/quant/recompute-reserved';
import { readRemovalMethods, withRemovalRefusal } from 'src/stock/removal/read-removal-methods';
import { MOVE_STATE } from 'src/stock/stock-options.constant';
import { stockLocations, stockMoveLines, stockMoves, stockPickingTypes, stockQuants } from 'src/stock/stock-records';
import { MOVE_LINE_ROW, MOVE_ROW, QUANT_ROW } from 'src/stock/stock-rows';
import { readResolvedUoms } from 'src/stock/stock-uoms';
import { nowIso, readStockSettings } from 'src/stock/stock-settings';
import { autoWave } from 'src/stock-picking-batch/auto-wave';
import { wavesAutomatically } from 'src/stock-picking-batch/utils/waves-automatically.util';
import { sortMovesForAssign } from 'src/stock/utils/check-availability.util';
import { bypassesReservation } from 'src/stock/utils/location-usage.util';
import { planReserve } from 'src/stock/utils/plan-reserve.util';
import { type LocationRow } from 'src/stock/types/location-row.type';
import { type MoveLineRow } from 'src/stock/types/move-line-row.type';
import { type MoveRow } from 'src/stock/types/move-row.type';
import { type MoveState } from 'src/stock/types/move-state.type';
import { type QuantRow } from 'src/stock/types/quant-row.type';
import { type ReserveProduct } from 'src/stock/utils/types/reserve-product.type';
import { type ReserveQuant } from 'src/stock/utils/types/reserve-quant.type';

const RESERVABLE_STATES: MoveState[] = [MOVE_STATE.CONFIRMED, MOVE_STATE.WAITING, MOVE_STATE.PARTIALLY_AVAILABLE];

const distinct = (ids: string[]) => [...new Set(ids)];

// Every quant of the products at or under the source locations.
const readReservableQuants = async (productIds: string[], sources: LocationRow[]): Promise<ReserveQuant[]> => {
  const paths = distinct(sources.flatMap((location) => (location.parentPath === null ? [] : [location.parentPath])));

  if (paths.length === 0) {
    return [];
  }

  const locations = await stockLocations.find<{ id: string; parentPath: string | null; completeName: string | null }>(
    { or: paths.map((path) => ({ parentPath: { like: `${path}%` } })) },
    'id parentPath completeName',
  );
  const locationById = new Map(locations.map((location) => [location.id, location]));
  const quants = await stockQuants.find<
    QuantRow & { createdAt: string; removalDate: string | null; package: { createdAt: string } | null }
  >(
    { productId: { in: productIds }, locationId: { in: [...locationById.keys()] } },
    `${QUANT_ROW} createdAt removalDate package { createdAt }`,
  );

  return quants.map((quant) => ({
    id: quant.id,
    productId: quant.productId,
    locationId: quant.locationId,
    locationParentPath: locationById.get(quant.locationId)?.parentPath ?? null,
    locationCompleteName: locationById.get(quant.locationId)?.completeName ?? null,
    ownerId: quant.ownerId,
    inDate: quant.inDate,
    createdAt: quant.createdAt,
    removalDate: quant.removalDate,
    quantity: quant.quantity,
    reservedQuantity: quant.reservedQuantity,
    lotId: quant.lotId,
    packageId: quant.packageId,
    packageCreatedAt: quant.package?.createdAt ?? null,
  }));
};

// Waving looks at every line of the moves asked for, reserved now or before,
// once their transfers have their new states, so a ready transfer is waved
// whole instead of being split.
const waveLinesOf = async (moves: MoveRow[]) => {
  const typeIds = distinct(moves.flatMap((move) => (move.pickingTypeId === null ? [] : [move.pickingTypeId])));
  const types =
    typeIds.length === 0
      ? []
      : await stockPickingTypes.find<{
          autoBatch: boolean;
          waveGroupByProduct: boolean;
          waveGroupByCategory: boolean;
          waveGroupByLocation: boolean;
        }>({ id: { in: typeIds } }, 'autoBatch waveGroupByProduct waveGroupByCategory waveGroupByLocation');

  if (!types.some(wavesAutomatically)) {
    return;
  }
  const lines = await stockMoveLines.find<{ id: string }>({ moveId: { in: moves.map((move) => move.id) } }, 'id');

  await autoWave(lines.map((line) => line.id));
};

export const assignMoves = async (moveIds: string[]) => {
  const { productUnitDigits: digits } = readStockSettings();
  const found = await stockMoves.find<MoveRow>({ id: { in: distinct(moveIds) } }, MOVE_ROW);
  const moves = sortMovesForAssign(
    found.filter(
      (move) => !move.picked && RESERVABLE_STATES.includes(move.state) && move.locationId !== null && move.productUomId !== null,
    ),
  );

  if (moves.length === 0) {
    await waveLinesOf(found);
    return;
  }

  const ids = moves.map((move) => move.id);
  const productIds = distinct(moves.map((move) => move.productId));
  const typeIds = distinct(moves.flatMap((move) => (move.pickingTypeId === null ? [] : [move.pickingTypeId])));
  const [products, uoms, sources, links, lines, pickingTypes] = await Promise.all([
    readStockProducts(productIds),
    readResolvedUoms(),
    readLocations(distinct(moves.map((move) => move.locationId ?? ''))),
    readMoveLinks(ids),
    stockMoveLines.find<MoveLineRow>({ moveId: { in: ids } }, MOVE_LINE_ROW),
    typeIds.length === 0
      ? []
      : stockPickingTypes.find<{ id: string; useCreateLots: boolean; useExistingLots: boolean }>(
          { id: { in: typeIds } },
          'id useCreateLots useExistingLots',
        ),
  ]);
  const lotTypeIds = new Set(pickingTypes.filter((type) => type.useCreateLots || type.useExistingLots).map((type) => type.id));
  const origins = await readOriginAvailability(moves, links, digits);
  const quants = await readReservableQuants(productIds, [...sources.values()]);
  const removal = await readRemovalMethods({
    categoryIds: [...products.values()].flatMap((product) => (product.categId === null ? [] : [product.categId])),
    parentPaths: [...sources.values()].map((location) => location.parentPath),
  });
  const reserveProducts = new Map<string, ReserveProduct>(
    [...products.values()].map((product) => [
      product.productId,
      {
        uomId: product.uomId,
        packagingReserveMethod: product.packagingReserveMethod,
        categoryRemovalMethod: removal.categoryMethodOf(product.categId),
        tracking: product.tracking,
        useExpirationDate: product.useExpirationDate,
      },
    ]),
  );
  const moveById = new Map(moves.map((move) => [move.id, move]));

  const plan = withRemovalRefusal(() =>
    planReserve({
      moves: moves.map((move) => {
        const source = sources.get(move.locationId ?? '');
        const origin = origins.get(move.id);

        return {
          id: move.id,
          productId: move.productId,
          productUomId: move.productUomId ?? '',
          productUomQty: move.productUomQty,
          quantity: move.quantity ?? 0,
          state: move.state,
          picked: move.picked,
          procureMethod: move.procureMethod,
          locationId: move.locationId ?? '',
          locationParentPath: source?.parentPath ?? null,
          locationDestId: move.locationDestId,
          pickingId: move.pickingId,
          packagingUomId: move.packagingUomId,
          date: move.date,
          bypass: (source !== undefined && bypassesReservation(source.usage)) || products.get(move.productId)?.isStorable !== true,
          removalMethodChain: removal.chainOf(source?.parentPath ?? null),
          usesLots: move.pickingTypeId !== null && lotTypeIds.has(move.pickingTypeId),
          originPoolKey: origin?.poolKey ?? null,
          originAvailable: origin?.available ?? [],
          lines: lines
            .filter((line) => line.moveId === move.id)
            .map((line) => ({
              id: line.id,
              locationId: line.locationId,
              locationDestId: line.locationDestId,
              ownerId: line.ownerId,
              productUomId: line.productUomId,
              quantity: line.quantity,
              quantityProductUom: line.quantityProductUom ?? line.quantity,
              picked: line.picked,
              pickingId: line.pickingId,
              lotId: line.lotId,
            })),
        };
      }),
      quants,
      products: reserveProducts,
      uoms,
      digits,
    }),
  );

  const newState = new Map<string, MoveState>([
    ...plan.partiallyAvailable.map((id) => [id, MOVE_STATE.PARTIALLY_AVAILABLE] as const),
    ...plan.assigned.map((id) => [id, MOVE_STATE.ASSIGNED] as const),
  ]);
  const destinations = await putawayDestinations(
    plan.creates.flatMap((line, index) =>
      line.locationDestId === null
        ? []
        : [
            {
              key: String(index),
              locationDestId: line.locationDestId,
              productId: line.productId,
              quantity: line.quantityProductUom,
              packageId: null,
              packagingUomId: moveById.get(line.moveId)?.packagingUomId ?? null,
            },
          ],
    ),
  );
  const createdIds = await stockMoveLines.createMany(
    plan.creates.map((line, index) => {
      const move = moveById.get(line.moveId);

      return {
        ...line,
        locationDestId: destinations.get(String(index)) ?? line.locationDestId,
        picked: false,
        date: nowIso(),
        state: newState.get(line.moveId) ?? move?.state,
        name: `${move?.reference ?? ''}: ${products.get(line.productId)?.displayName ?? ''}`,
      };
    }),
  );

  for (const grow of plan.grows) {
    await stockMoveLines.update(grow.lineId, { quantity: grow.quantity, quantityProductUom: grow.quantityProductUom });
  }
  await stockMoves.updateMany(plan.partiallyAvailable, { state: MOVE_STATE.PARTIALLY_AVAILABLE });
  await stockMoves.updateMany(plan.assigned, { state: MOVE_STATE.ASSIGNED });

  await recomputeReserved(plan.touchedKeys);
  const { changedMoveIds } = await cutBackOverReservation(plan.touchedKeys);
  const changedMoves = changedMoveIds.length === 0
    ? []
    : await stockMoves.find<{ id: string; pickingId: string | null }>({ id: { in: changedMoveIds } }, 'id pickingId');
  const pickingIds = distinct(
    [...moves, ...changedMoves].flatMap((move) => (move.pickingId === null ? [] : [move.pickingId])),
  );

  await recomputeMove(distinct([...ids, ...changedMoveIds]));
  await checkEntirePack(pickingIds);
  // A new line that now moves its package whole is placed by that package.
  const packedIds = (
    await stockMoveLines.find<{ id: string }>({ id: { in: createdIds }, resultPackageId: { is: 'NOT_NULL' } }, 'id')
  ).map((line) => line.id);

  await applyPutawayStrategy(packedIds);
  await recomputePickingState(pickingIds);
  await recomputeProductQuantities(productIds);
  await waveLinesOf(found);
};
