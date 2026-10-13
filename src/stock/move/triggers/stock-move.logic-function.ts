import { type DatabaseEventBatchPayload, defineLogicFunction, type ObjectRecordEvent } from 'twenty-sdk/define';

import { readEvents } from 'src/shared/triggers/batch-events';
import { errorCollector } from 'src/shared/triggers/retry-on-conflict';
import { handleMoveCreated } from 'src/stock/move/rules/move-created';
import { handleMoveDates } from 'src/stock/move/rules/move-dates';
import { handleMoveDeletes } from 'src/stock/move/rules/move-delete';
import { handleMoveDemand } from 'src/stock/move/rules/move-demand';
import { handleMoveLocations } from 'src/stock/move/rules/move-locations';
import { handleMovePicking } from 'src/stock/move/rules/move-picking';
import { handleMovePicked, handleMoveQuantity } from 'src/stock/move/rules/move-quantity';
import { handleMoveUnit } from 'src/stock/move/rules/move-unit';
import { recomputeOrderpointsForMoves } from 'src/stock/orderpoint/orderpoint-recompute-triggers';
import { handleMoveBatchRules } from 'src/stock-picking-batch/move-batch-rules';
import { STOCK_MOVE_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER } from 'src/stock/stock-universal-identifiers.constant';
import { type MoveEventRecord } from 'src/stock/move/types/move-event-record.type';

// Refusals (unit, then the quantity checks inside the quantity rule) run before the rules that write.
const handler = async (payload: DatabaseEventBatchPayload<ObjectRecordEvent<MoveEventRecord>>) => {
  const { operation, events } = readEvents<MoveEventRecord>(payload);
  const errors = errorCollector();

  await handleMoveCreated(events, operation, errors);
  await handleMoveUnit(events, operation, errors);
  await handleMoveDemand(events, operation, errors);
  await handleMoveQuantity(events, operation, errors);
  await handleMovePicked(events, operation, errors);
  await handleMoveDates(events, operation, errors);
  await handleMoveLocations(events, operation, errors);
  await handleMovePicking(events, operation, errors);
  await handleMoveDeletes(events, operation, errors);
  await recomputeOrderpointsForMoves(events, operation, errors);
  await handleMoveBatchRules(events, operation, errors);

  errors.throwIfAny();
  return {};
};

export default defineLogicFunction({
  universalIdentifier: STOCK_MOVE_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'platform-stock-move',
  description:
    'Fills a new move from its transfer and confirms an added one; follows changed demand, typed quantity, picked flag, dates, deadlines, locations and transfer; frees a deleted move\'s reservation; puts back changes to cancelled or done moves and deletes of linked or done moves; recomputes the reordering rules of its product; a ready transfer that gets a move or a reservation looks for a batch.',
  timeoutSeconds: 300,
  handler,
  databaseEventTriggerSettings: { eventName: 'stockMove.*', batchMode: true },
});
