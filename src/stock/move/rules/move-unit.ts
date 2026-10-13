import { type ObjectRecordEvent } from 'twenty-sdk/define';

import { type RecordOperation } from 'src/shared/triggers/batch-events';
import { type ErrorCollector } from 'src/shared/triggers/retry-on-conflict';
import { recomputeMove } from 'src/stock/move/recompute-move';
import { recomputeProductQuantities } from 'src/stock/product/recompute-product-quantities';
import { eventAfter, eventBefore, eventChangedFields, isStaffEvent } from 'src/stock/stock-event-helpers';
import { MOVE_STATE } from 'src/stock/stock-options.constant';
import { putBackForEvent } from 'src/stock/stock-put-back';
import { stockMoves } from 'src/stock/stock-records';
import { DONE_MOVE_UNIT_MESSAGE } from 'src/stock/utils/plan-move-rules.util';
import { type MoveEventRecord } from 'src/stock/move/types/move-event-record.type';

const OBJECT = { objectSingular: 'stockMove', objectPlural: 'stockMoves' } as const;

export const handleMoveUnit = async (
  events: ObjectRecordEvent<MoveEventRecord>[],
  operation: RecordOperation,
  errors: ErrorCollector,
) => {
  if (operation !== 'updated') {
    return;
  }

  for (const event of events) {
    const before = eventBefore(event);
    const after = eventAfter(event);

    if (
      before === undefined ||
      after === undefined ||
      !isStaffEvent(operation, event) ||
      !eventChangedFields(event, ['productUomId']).includes('productUomId')
    ) {
      continue;
    }
    await errors.run(event.recordId, async () => {
      const [move] = await stockMoves.find<{ id: string; state: string; productUomId: string | null; productId: string }>(
        { id: { eq: event.recordId } },
        'id state productUomId productId',
      );

      if (move === undefined || move.productUomId !== after.productUomId) {
        return;
      }
      if (move.state === MOVE_STATE.DONE) {
        await putBackForEvent({ ...OBJECT, event, data: { productUomId: before.productUomId }, message: DONE_MOVE_UNIT_MESSAGE });
        return;
      }
      await recomputeMove([move.id]);
      await recomputeProductQuantities([move.productId]);
    });
  }
};
