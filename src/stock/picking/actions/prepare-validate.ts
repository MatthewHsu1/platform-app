import { isWholeBatch } from 'src/stock-picking-batch/is-whole-batch';
import { expiredLotsToConfirm, trackingRefusals } from 'src/stock/lot/validate-tracking-checks';
import { setMoveQuantity } from 'src/stock/move/actions/set-move-quantity';
import { confirmPickings } from 'src/stock/picking/actions/confirm-pickings';
import { readStockProducts } from 'src/stock/product/read-stock-products';
import { LOCATION_USAGE, PICKING_STATE } from 'src/stock/stock-options.constant';
import { stockLocations, stockMoveLines, stockMoves, stockPickings, stockPickingTypes } from 'src/stock/stock-records';
import { LOCATION_ROW, MOVE_LINE_ROW, MOVE_ROW, PICKING_ROW, PICKING_TYPE_ROW } from 'src/stock/stock-rows';
import { readStockSettings } from 'src/stock/stock-settings';
import { readResolvedUoms } from 'src/stock/stock-uoms';
import { planBackorderNeeded, planNoBackorder } from 'src/stock/utils/plan-backorder-needed.util';
import { planLineRefusals, planPreDonePicked, planSanityCheck } from 'src/stock/utils/plan-validate-checks.util';
import { convertQuantity, isZeroAtDigits } from 'src/stock/utils/stock-uom.util';
import { type PrepareValidateDeps } from 'src/stock/picking/types/prepare-validate-deps.type';
import { type PrepareValidatePicking } from 'src/stock/picking/types/prepare-validate-picking.type';
import { type PreparedValidate } from 'src/stock/picking/types/prepared-validate.type';
import { type ValidateOptions } from 'src/stock/picking/types/validate-options.type';
import { type ValidateResult } from 'src/stock/picking/types/validate-result.type';
import { type LocationRow } from 'src/stock/types/location-row.type';
import { type MoveLineRow } from 'src/stock/types/move-line-row.type';
import { type MoveRow } from 'src/stock/types/move-row.type';
import { type PickingRow } from 'src/stock/types/picking-row.type';
import { type PickingTypeRow } from 'src/stock/types/picking-type-row.type';

// The lines the run will keep, as they look once the pre-done marking below has been written.
const withPlannedPicks = (pickings: PrepareValidatePicking[]): PrepareValidatePicking[] =>
  pickings.map((row) => {
    const marked = new Set(planPreDonePicked(row));

    return {
      ...row,
      moves: row.moves.map((move) =>
        marked.has(move.id) ? { ...move, picked: true, lines: move.lines.map((line) => ({ ...line, picked: true })) } : move,
      ),
    };
  });

const joinedOrNull = (messages: string[]) => (messages.length > 0 ? messages.join('\n\n') : null);

export const makePrepareValidate =
  (deps: PrepareValidateDeps) =>
  async (
    pickingIds: string[],
    options: ValidateOptions,
  ): Promise<PreparedValidate | Exclude<ValidateResult, { kind: 'done' }>> => {
    const digits = deps.digits();
    const notDone = (rows: PrepareValidatePicking[]) => rows.filter((row) => row.state !== PICKING_STATE.DONE);
    let pickings = notDone(await deps.readPickings(pickingIds));

    if (pickings.length === 0) {
      return { kind: 'ready', pickingIds: [], noBackorderIds: [], askedIds: [] };
    }

    const drafts = pickings.filter((row) => row.state === PICKING_STATE.DRAFT);

    if (drafts.length > 0) {
      await deps.confirmPickings(drafts.map((row) => row.id));
      for (const move of (await deps.readPickings(drafts.map((row) => row.id))).flatMap((row) => row.moves)) {
        if (isZeroAtDigits(move.quantity, digits) && !isZeroAtDigits(move.productUomQty, digits)) {
          await deps.setMoveQuantity(move.id, move.productUomQty);
        }
      }
      pickings = notDone(await deps.readPickings(pickings.map((row) => row.id)));
    }

    const ids = pickings.map((row) => row.id);
    // Several transfers are listed one by one, unless they are exactly one batch's transfers: then they
    // are asked about and refused as one.
    const showTransfers = ids.length > 1 && !(await deps.isWholeBatch(ids, options.pickingsToDetach ?? []));

    // The order the refusals come in: the transfer checks (with the lots missing on picked lines), the lines'
    // quantities, then the lots of the lines the run commits.
    if (options.skipPreChecks !== true) {
      const refusal =
        planSanityCheck({ pickings, digits, trackingMessages: await deps.trackingRefusals(ids, { stage: 'transfers' }), showTransfers }) ??
        planLineRefusals({ pickings: withPlannedPicks(pickings), digits }) ??
        joinedOrNull(await deps.trackingRefusals(ids, { stage: 'lines' }));

      if (refusal !== null) {
        return { kind: 'refused', reason: refusal };
      }
    }

    const toMark = new Set(pickings.flatMap((row) => planPreDonePicked(row)));

    if (toMark.size > 0) {
      await deps.markPicked([...toMark]);
      pickings = pickings.map((row) => ({
        ...row,
        moves: row.moves.map((move) =>
          toMark.has(move.id) ? { ...move, picked: true, lines: move.lines.map((line) => ({ ...line, picked: true })) } : move,
        ),
      }));
    }

    const askedIds = pickings
      .filter((row) => planBackorderNeeded({ createBackorder: row.createBackorder, moves: row.moves, digits }))
      .map((row) => row.id);

    if (options.cancelBackorder === undefined && askedIds.length > 0) {
      return { kind: 'needsAnswer', question: 'backorder', pickingIds: askedIds, showTransfers };
    }

    if (options.skipExpired !== true) {
      const lotIds = await deps.expiredLotsToConfirm(ids);

      if (lotIds !== null) {
        return { kind: 'needsAnswer', question: 'expiredLots', pickingIds: ids, lotIds };
      }
    }

    return {
      kind: 'ready',
      pickingIds: ids,
      noBackorderIds: planNoBackorder({ pickings, cancelBackorder: options.cancelBackorder }),
      askedIds,
    };
  };

const readPickings = async (pickingIds: string[]): Promise<PrepareValidatePicking[]> => {
  if (pickingIds.length === 0) {
    return [];
  }
  const { productUnitDigits: digits } = readStockSettings();
  const pickings = await stockPickings.find<PickingRow>({ id: { in: pickingIds } }, PICKING_ROW);
  const [types, moves, lines, uoms] = await Promise.all([
    stockPickingTypes.find<PickingTypeRow>(
      { id: { in: pickings.flatMap((row) => (row.pickingTypeId === null ? [] : [row.pickingTypeId])) } },
      PICKING_TYPE_ROW,
    ),
    stockMoves.find<MoveRow>({ pickingId: { in: pickingIds } }, MOVE_ROW),
    stockMoveLines.find<MoveLineRow>({ pickingId: { in: pickingIds } }, MOVE_LINE_ROW),
    readResolvedUoms(),
  ]);
  const [products, destinations] = await Promise.all([
    readStockProducts([...new Set(moves.map((row) => row.productId))]),
    stockLocations.find<LocationRow>(
      { id: { in: [...new Set(moves.flatMap((row) => (row.locationDestId === null ? [] : [row.locationDestId])))] } },
      LOCATION_ROW,
    ),
  ]);
  const typeById = new Map(types.map((row) => [row.id, row]));
  const usageById = new Map(destinations.map((row) => [row.id, row.usage]));

  return pickings.map((picking) => ({
    id: picking.id,
    name: picking.name ?? '/',
    state: picking.state,
    createBackorder: typeById.get(picking.pickingTypeId ?? '')?.createBackorder ?? 'ASK',
    lineCount: lines.filter((line) => line.pickingId === picking.id).length,
    moves: moves
      .filter((move) => move.pickingId === picking.id)
      .map((move) => {
        const product = products.get(move.productId);
        const moveUomId = move.productUomId ?? product?.uomId ?? '';

        return {
          id: move.id,
          state: move.state,
          quantity: move.quantity ?? 0,
          productUomQty: move.productUomQty,
          picked: move.picked,
          isScrap: usageById.get(move.locationDestId ?? '') === LOCATION_USAGE.INVENTORY,
          productName: product?.displayName ?? '',
          uomName: uoms.get(moveUomId)?.name ?? '',
          lines: lines
            .filter((line) => line.moveId === move.id)
            .map((line) => ({
              id: line.id,
              quantity: line.quantity,
              picked: line.picked,
              quantityInMoveUnit: convertQuantity({
                qty: line.quantity,
                fromUomId: line.productUomId ?? moveUomId,
                toUomId: moveUomId,
                uoms,
                digits,
                round: false,
              }),
            })),
        };
      }),
  }));
};

export const prepareValidate = makePrepareValidate({
  readPickings,
  confirmPickings,
  setMoveQuantity,
  // Lines first: a move recompute reads the move before its lines, so one
  // that sees the move picked also sees its lines picked. Marked the other
  // way round, it could see a picked move with unpicked lines and put the
  // move back to not picked before Validate reads it.
  markPicked: async (moveIds) => {
    const lines = await stockMoveLines.find<{ id: string }>({ moveId: { in: moveIds } }, 'id');
    await stockMoveLines.updateMany(
      lines.map((line) => line.id),
      { picked: true },
    );
    await stockMoves.updateMany(moveIds, { picked: true });
  },
  trackingRefusals,
  expiredLotsToConfirm,
  isWholeBatch,
  digits: () => readStockSettings().productUnitDigits,
});
