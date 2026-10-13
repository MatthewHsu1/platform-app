import { type ObjectRecordEvent } from 'twenty-sdk/define';

import { readMemberLocale } from 'src/shared/i18n/read-user-locale';
import { translate } from 'src/shared/i18n/translate';
import { type RecordOperation } from 'src/shared/triggers/batch-events';
import { addNote } from 'src/shared/triggers/put-back';
import { type ErrorCollector } from 'src/shared/triggers/retry-on-conflict';
import { readLocations } from 'src/stock/location/read-locations';
import { assignMoves } from 'src/stock/move/actions/assign-moves';
import { unreserveMoves } from 'src/stock/move/actions/unreserve-moves';
import { recomputeMove } from 'src/stock/move/recompute-move';
import { recomputePickingState } from 'src/stock/picking/recompute-picking-state';
import { readStockProducts } from 'src/stock/product/read-stock-products';
import { recomputeProductQuantities } from 'src/stock/product/recompute-product-quantities';
import { eventAfter, eventBefore, eventChangedFields, isStaffEvent } from 'src/stock/stock-event-helpers';
import { MOVE_STATE } from 'src/stock/stock-options.constant';
import { stockMoves } from 'src/stock/stock-records';
import { MOVE_ROW } from 'src/stock/stock-rows';
import { readStockSettings } from 'src/stock/stock-settings';
import { DEMAND_CHANGED_NOTE, planDemandChange } from 'src/stock/utils/plan-move-rules.util';
import { type MoveEventRecord } from 'src/stock/move/types/move-event-record.type';
import { type MoveRow } from 'src/stock/types/move-row.type';

export const handleMoveDemand = async (
  events: ObjectRecordEvent<MoveEventRecord>[],
  operation: RecordOperation,
  errors: ErrorCollector,
) => {
  if (operation !== 'updated') {
    return;
  }
  const changed = events.filter(
    (event) => isStaffEvent(operation, event) && eventChangedFields(event, ['productUomQty']).includes('productUomQty'),
  );

  if (changed.length === 0) {
    return;
  }
  await errors.run('demand', async () => {
    const moves = await stockMoves.find<MoveRow>({ id: { in: changed.map((event) => event.recordId) } }, MOVE_ROW);
    const [locations, products] = await Promise.all([
      readLocations([...new Set(moves.flatMap((move) => (move.locationId === null ? [] : [move.locationId])))]),
      readStockProducts([...new Set(moves.map((move) => move.productId))]),
    ]);
    const byId = new Map(moves.map((move) => [move.id, move]));
    const eventById = new Map(changed.map((event) => [event.recordId, event]));
    const plan = planDemandChange({
      digits: readStockSettings().productUnitDigits,
      moves: moves.map((move) => ({
        id: move.id,
        pickingId: move.pickingId,
        sourceUsage: move.locationId === null ? null : (locations.get(move.locationId)?.usage ?? null),
        state: move.state,
        quantity: move.quantity ?? 0,
        oldDemand: eventBefore(eventById.get(move.id) as ObjectRecordEvent<MoveEventRecord>)?.productUomQty ?? 0,
        newDemand: move.productUomQty,
      })),
    });

    for (const moveId of plan.notes) {
      const move = byId.get(moveId) as MoveRow;
      const event = eventById.get(moveId) as ObjectRecordEvent<MoveEventRecord>;
      const locale = await readMemberLocale(event.workspaceMemberId);

      await addNote({
        objectSingular: 'stockPicking',
        recordId: move.pickingId as string,
        title: translate(locale, 'Demand changed'),
        body: translate(locale, DEMAND_CHANGED_NOTE, {
          product: products.get(move.productId)?.displayName ?? '',
          before: eventBefore(event)?.productUomQty ?? 0,
          after: eventAfter(event)?.productUomQty ?? 0,
        }),
      });
    }
    if (plan.unreserve.length > 0) {
      await unreserveMoves(plan.unreserve);
    }
    if (plan.setPartiallyAvailable.length > 0) {
      await stockMoves.updateMany(plan.setPartiallyAvailable, { state: MOVE_STATE.PARTIALLY_AVAILABLE });
    }
    if (plan.reassign.length > 0) {
      await assignMoves(plan.reassign);
    }
    await recomputeMove(moves.map((move) => move.id));
    await recomputePickingState([...new Set(moves.flatMap((move) => (move.pickingId === null ? [] : [move.pickingId])))]);
    await recomputeProductQuantities([...new Set(moves.map((move) => move.productId))]);
  });
};
