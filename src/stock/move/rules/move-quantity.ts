import { type ObjectRecordEvent } from 'twenty-sdk/define';

import { type RecordOperation } from 'src/shared/triggers/batch-events';
import { type ErrorCollector } from 'src/shared/triggers/retry-on-conflict';
import { floatRound } from 'src/shared/utils/float-round.util';
import { setMoveQuantity } from 'src/stock/move/actions/set-move-quantity';
import { recomputeMove } from 'src/stock/move/recompute-move';
import { recomputePickingState } from 'src/stock/picking/recompute-picking-state';
import { readStockProducts } from 'src/stock/product/read-stock-products';
import { recomputeProductQuantities } from 'src/stock/product/recompute-product-quantities';
import { eventAfter, eventBefore, eventChangedFields, isStaffEvent } from 'src/stock/stock-event-helpers';
import { MOVE_STATE } from 'src/stock/stock-options.constant';
import { putBackForEvent } from 'src/stock/stock-put-back';
import { stockMoveLines, stockMoves } from 'src/stock/stock-records';
import { MOVE_ROW } from 'src/stock/stock-rows';
import { nowIso, readStockSettings } from 'src/stock/stock-settings';
import { CANCELLED_MOVE_QUANTITY_MESSAGE, QUANTITY_PRECISION_MESSAGE } from 'src/stock/utils/plan-move-rules.util';
import { type MoveEventRecord } from 'src/stock/move/types/move-event-record.type';
import { type MoveRow } from 'src/stock/types/move-row.type';
import { type MoveState } from 'src/stock/types/move-state.type';

const OBJECT = { objectSingular: 'stockMove', objectPlural: 'stockMoves' } as const;

export const handleMoveQuantity = async (
  events: ObjectRecordEvent<MoveEventRecord>[],
  operation: RecordOperation,
  errors: ErrorCollector,
) => {
  if (operation !== 'updated') {
    return;
  }
  const digits = readStockSettings().productUnitDigits;

  for (const event of events) {
    const before = eventBefore(event);
    const after = eventAfter(event);

    if (
      before === undefined ||
      after === undefined ||
      !isStaffEvent(operation, event) ||
      !eventChangedFields(event, ['quantity']).includes('quantity')
    ) {
      continue;
    }
    await errors.run(event.recordId, async () => {
      const [move] = await stockMoves.find<MoveRow>({ id: { eq: event.recordId } }, MOVE_ROW);

      if (move === undefined || move.quantity !== after.quantity) {
        return;
      }
      if (move.state === MOVE_STATE.CANCEL) {
        await putBackForEvent({ ...OBJECT, event, data: { quantity: before.quantity }, message: CANCELLED_MOVE_QUANTITY_MESSAGE });
        return;
      }
      const quantity = move.quantity ?? 0;

      if (floatRound(quantity, 10 ** -digits, 'HALF-UP') !== quantity) {
        const product = (await readStockProducts([move.productId])).get(move.productId);

        await putBackForEvent({
          ...OBJECT,
          event,
          data: { quantity: before.quantity },
          message: QUANTITY_PRECISION_MESSAGE,
          values: { product: product?.displayName ?? '' },
        });
        return;
      }
      // Lines, reserved, cut-back, the move and its transfer are written by the inverse itself.
      await setMoveQuantity(move.id, quantity);
      await recomputeProductQuantities([move.productId]);
    });
  }
};

// The picked flag typed on a move is written on all its lines. A line
// of a live move that becomes picked takes the current time, as the move line
// open-line rule does for a staff edit (the app's own line writes skip that rule).
export const handleMovePicked = async (
  events: ObjectRecordEvent<MoveEventRecord>[],
  operation: RecordOperation,
  errors: ErrorCollector,
) => {
  if (operation !== 'updated') {
    return;
  }

  for (const event of events) {
    if (!isStaffEvent(operation, event) || !eventChangedFields(event, ['picked']).includes('picked')) {
      continue;
    }
    await errors.run(event.recordId, async () => {
      const [move] = await stockMoves.find<{ id: string; picked: boolean; pickingId: string | null }>(
        { id: { eq: event.recordId } },
        'id picked pickingId',
      );

      if (move === undefined) {
        return;
      }
      const lines = await stockMoveLines.find<{ id: string; picked: boolean; state: string }>(
        { moveId: { eq: move.id } },
        'id picked state',
      );
      const changed = lines.filter((line) => line.picked !== move.picked);
      const dated = changed.filter(
        (line) => move.picked && !([MOVE_STATE.DRAFT, MOVE_STATE.CANCEL, MOVE_STATE.DONE] as MoveState[]).includes(line.state as MoveState),
      );
      const undated = changed.filter((line) => !dated.includes(line));

      if (dated.length > 0) {
        await stockMoveLines.updateMany(
          dated.map((line) => line.id),
          { picked: move.picked, date: nowIso() },
        );
      }
      if (undated.length > 0) {
        await stockMoveLines.updateMany(
          undated.map((line) => line.id),
          { picked: move.picked },
        );
      }
      await recomputeMove([move.id]);
      await recomputePickingState(move.pickingId === null ? [] : [move.pickingId]);
    });
  }
};
