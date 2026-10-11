import { createMissingRows } from 'src/shared/claims/create-missing-rows';
import { LOT_COMPENSATION_SELECTION, lotCompensationData } from 'src/stock/lot/lot-compensation-data';
import { stockLotCompensations } from 'src/stock/lot/lot-records';
import { confirmMoves } from 'src/stock/move/actions/confirm-moves';
import { assignMoves } from 'src/stock/move/actions/assign-moves';
import { cancelMoves } from 'src/stock/move/actions/cancel-moves';
import { retryWaitingMoves } from 'src/stock/move/actions/retry-waiting-moves';
import { readMoveReferences } from 'src/stock/move/move-links';
import { recomputeMove } from 'src/stock/move/recompute-move';
import { planReservationRelease, releaseReservation } from 'src/stock/move-line/free-reservation';
import { applyTrackingOnDone } from 'src/stock/lot/apply-tracking-on-done';
import { applyPackagesAfterDone, readPackagesAfterDone } from 'src/stock/package/validate/apply-dest-to-packages';
import { recomputeTrackingForKeys } from 'src/stock/lot/recompute-tracking-for-keys';
import { recomputePickingState } from 'src/stock/picking/recompute-picking-state';
import { pushApply } from 'src/stock/procurement/push-apply';
import { readStockProducts } from 'src/stock/product/read-stock-products';
import { recomputeProductQuantities } from 'src/stock/product/recompute-product-quantities';
import { applyQuantDelta } from 'src/stock/quant/apply-quant-delta';
import { settleQuantDelta } from 'src/stock/quant/settle-quant-delta';
import { recomputeReserved } from 'src/stock/quant/recompute-reserved';
import { MOVE_STATE } from 'src/stock/stock-options.constant';
import {
  stockMoveLines,
  stockMoveMoveRels,
  stockMoves,
  stockPickings,
  stockQuants,
  stockReferenceMoveRels,
} from 'src/stock/stock-records';
import { MOVE_LINE_ROW, MOVE_MOVE_REL_ROW, MOVE_ROW } from 'src/stock/stock-rows';
import { nowIso, readStockSettings } from 'src/stock/stock-settings';
import { readResolvedUoms } from 'src/stock/stock-uoms';
import { convertQuantity } from 'src/stock/utils/stock-uom.util';
import { type LotCompensation } from 'src/stock/lot/types/lot-compensation.type';
import { type DoneMovesStore } from 'src/stock/move/types/done-moves-store.type';
import { type SplitMoveCreate } from 'src/stock/move/types/split-move-create.type';
import { type MoveLineRow } from 'src/stock/types/move-line-row.type';
import { type MoveMoveRelRow } from 'src/stock/types/move-move-rel-row.type';
import { type MoveRow } from 'src/stock/types/move-row.type';
import { type MoveState } from 'src/stock/types/move-state.type';
import { type PickingTypeCode } from 'src/stock/types/picking-type-code.type';

const isLive = (state: MoveState) => state !== MOVE_STATE.DONE && state !== MOVE_STATE.CANCEL;

// A split move belongs to the references of the move it came from.
const copyReferenceLinks = async (moves: SplitMoveCreate[]) => {
  const wanted = moves.flatMap((move) => move.referenceIds.map((referenceId) => ({ referenceId, moveId: move.id })));

  if (wanted.length === 0) {
    return;
  }
  const present = await stockReferenceMoveRels.find<{ referenceId: string; moveId: string }>(
    { moveId: { in: moves.map((move) => move.id) } },
    'referenceId moveId',
  );
  const presentKeys = new Set(present.map((link) => `${link.referenceId}|${link.moveId}`));

  await stockReferenceMoveRels.createMany(wanted.filter((link) => !presentKeys.has(`${link.referenceId}|${link.moveId}`)));
};

// The fields a split move copies from its move; demand, unit and
// links are set by the split itself.
const copyValuesOf = (move: MoveRow) => ({
  productId: move.productId,
  locationId: move.locationId,
  locationDestId: move.locationDestId,
  locationFinalId: move.locationFinalId,
  companyId: move.companyId,
  personId: move.personId,
  pickingId: move.pickingId,
  priority: move.priority,
  date: move.date,
  dateDeadline: move.dateDeadline,
  origin: move.origin,
  procureMethod: move.procureMethod,
  propagateCancel: move.propagateCancel,
  pickingTypeId: move.pickingTypeId,
  warehouseId: move.warehouseId,
  restrictPartnerId: move.restrictPartnerId,
  descriptionPickingManual: move.descriptionPickingManual,
  sequence: move.sequence,
  originReturnedMoveId: move.originReturnedMoveId,
  packagingUomId: move.packagingUomId,
  ...(move.priceUnit === null ? {} : { priceUnit: { amountMicros: move.priceUnit.amountMicros, currencyCode: move.priceUnit.currencyCode } }),
});

export const graphqlDoneMovesStore: DoneMovesStore = {
  readMoves: async (moveIds) => {
    if (moveIds.length === 0) {
      return [];
    }
    const { productUnitDigits: digits } = readStockSettings();
    const moves = await stockMoves.find<MoveRow>({ id: { in: moveIds } }, MOVE_ROW);
    const [lines, links, uoms, products, references] = await Promise.all([
      stockMoveLines.find<MoveLineRow>({ moveId: { in: moveIds } }, MOVE_LINE_ROW),
      stockMoveMoveRels.find<MoveMoveRelRow>(
        { or: [{ moveOrigId: { in: moveIds } }, { moveDestId: { in: moveIds } }] },
        MOVE_MOVE_REL_ROW,
      ),
      readResolvedUoms(),
      readStockProducts([...new Set(moves.map((move) => move.productId))]),
      readMoveReferences(moveIds),
    ]);
    const destinationIds = [...new Set(links.filter((link) => moveIds.includes(link.moveOrigId)).map((link) => link.moveDestId))];
    const pickingIds = [...new Set(moves.flatMap((move) => (move.pickingId === null ? [] : [move.pickingId])))];
    const [destinations, pickings] = await Promise.all([
      destinationIds.length === 0 ? [] : stockMoves.find<{ id: string; state: MoveState }>({ id: { in: destinationIds } }, 'id state'),
      pickingIds.length === 0
        ? []
        : stockPickings.find<{ id: string; pickingTypeCode: PickingTypeCode | null }>({ id: { in: pickingIds } }, 'id pickingTypeCode'),
    ]);
    const liveDestinations = new Set(destinations.filter((move) => isLive(move.state)).map((move) => move.id));
    const typeCodeByPicking = new Map(pickings.map((row) => [row.id, row.pickingTypeCode]));

    return moves.map((move) => {
      const product = products.get(move.productId);
      const productUnitUomId = product?.uomId ?? move.productUomId ?? '';
      const moveUomId = move.productUomId ?? productUnitUomId;
      const inProductUnit = (qty: number, fromUomId: string) =>
        convertQuantity({ qty, fromUomId, toUomId: productUnitUomId, uoms, digits, method: 'HALF-UP' });

      return {
        id: move.id,
        state: move.state,
        picked: move.picked,
        productUomQty: move.productUomQty,
        productQty: move.productQty ?? inProductUnit(move.productUomQty, moveUomId),
        isInventory: move.isInventory,
        productId: move.productId,
        productUomId: moveUomId,
        productUnitUomId,
        isStorable: product?.isStorable ?? false,
        pickingId: move.pickingId,
        pickingTypeCode: move.pickingId === null ? null : typeCodeByPicking.get(move.pickingId) ?? null,
        procureMethod: move.procureMethod,
        moveOrigIds: links.filter((link) => link.moveDestId === move.id).map((link) => link.moveOrigId),
        openMoveDestIds: links
          .filter((link) => link.moveOrigId === move.id && liveDestinations.has(link.moveDestId))
          .map((link) => link.moveDestId),
        referenceIds: references.get(move.id) ?? [],
        copyValues: copyValuesOf(move),
        lines: lines
          .filter((line) => line.moveId === move.id)
          .map((line) => ({
            id: line.id,
            state: line.state,
            quantity: line.quantity,
            productUomId: line.productUomId ?? moveUomId,
            quantityProductUom: line.quantityProductUom ?? inProductUnit(line.quantity, line.productUomId ?? moveUomId),
            picked: line.picked,
            productId: line.productId,
            locationId: line.locationId ?? move.locationId ?? '',
            locationDestId: line.locationDestId ?? move.locationDestId ?? '',
            ownerId: line.ownerId,
            lotId: line.lotId,
            packageId: line.packageId,
            resultPackageId: line.resultPackageId,
          })),
      };
    });
  },
  uoms: readResolvedUoms,
  digits: () => readStockSettings().productUnitDigits,
  now: nowIso,
  newId: () => crypto.randomUUID(),
  confirmMoves,
  cancelMoves,
  destroyLines: async (lineIds) => {
    await stockMoveLines.destroyMany(lineIds);
  },
  // A split move starts as a draft to be confirmed, unless its values carry the state it keeps.
  createSplitMoves: async (moves) => {
    await createMissingRows(
      stockMoves,
      moves.map((move) => ({ id: move.id, data: { state: MOVE_STATE.DRAFT, ...move.values } })),
    );
    await copyReferenceLinks(moves);
    const wanted = moves.flatMap((move) => [
      ...move.moveOrigIds.map((moveOrigId) => ({ moveOrigId, moveDestId: move.id })),
      ...move.moveDestIds.map((moveDestId) => ({ moveOrigId: move.id, moveDestId })),
    ]);

    if (wanted.length === 0) {
      return;
    }
    const ids = moves.map((move) => move.id);
    const present = await stockMoveMoveRels.find<MoveMoveRelRow>(
      { or: [{ moveOrigId: { in: ids } }, { moveDestId: { in: ids } }] },
      MOVE_MOVE_REL_ROW,
    );
    const presentKeys = new Set(present.map((link) => `${link.moveOrigId}|${link.moveDestId}`));

    await stockMoveMoveRels.createMany(wanted.filter((link) => !presentKeys.has(`${link.moveOrigId}|${link.moveDestId}`)));
  },
  updateMoves: async (updates) => {
    for (const update of updates) {
      await stockMoves.update(update.id, update.data);
    }
  },
  commitLine: async (lineId, date) => {
    await stockMoveLines.update(lineId, { state: MOVE_STATE.DONE, date });
  },
  applyQuantDelta: (args) => applyQuantDelta(args),
  settleQuantDelta,
  recomputeReserved,
  readAvailable: async (key) => {
    const [quant] = await stockQuants.find<{ quantity: number; reservedQuantity: number }>(
      { quantKey: { eq: key } },
      'quantity reservedQuantity',
    );
    return quant === undefined ? 0 : quant.quantity - quant.reservedQuantity;
  },
  planReservationRelease,
  releaseReservation,
  readLotCompensation: async (id) =>
    (await stockLotCompensations.find<LotCompensation>({ id: { eq: id } }, LOT_COMPENSATION_SELECTION))[0] ?? null,
  createLotCompensation: async (row) =>
    (await createMissingRows(stockLotCompensations, [{ id: row.id, data: lotCompensationData(row) }])).length > 0,
  applyTrackingOnDone,
  planPackagesAfterDone: readPackagesAfterDone,
  applyPackagesAfterDone,
  recomputeMove,
  recomputePickingState,
  recomputeProductQuantities,
  recomputeTrackingForKeys,
  pushApply,
  readOpenDestinationMoveIds: async (moveIds) => {
    if (moveIds.length === 0) {
      return [];
    }
    const links = await stockMoveMoveRels.find<MoveMoveRelRow>({ moveOrigId: { in: moveIds } }, MOVE_MOVE_REL_ROW);
    const destinationIds = [...new Set(links.map((link) => link.moveDestId))];

    if (destinationIds.length === 0) {
      return [];
    }
    return (await stockMoves.find<{ id: string; state: MoveState }>({ id: { in: destinationIds } }, 'id state'))
      .filter((move) => isLive(move.state))
      .map((move) => move.id);
  },
  assignMoves,
  retryWaitingMoves,
};
