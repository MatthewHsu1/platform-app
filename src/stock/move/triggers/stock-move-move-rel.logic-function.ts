import { type DatabaseEventBatchPayload, defineLogicFunction, type ObjectRecordEvent } from 'twenty-sdk/define';

import { readEvents } from 'src/shared/triggers/batch-events';
import { errorCollector } from 'src/shared/triggers/retry-on-conflict';
import { recomputeMove } from 'src/stock/move/recompute-move';
import { eventAfter, eventBefore, isStaffEvent } from 'src/stock/stock-event-helpers';
import { stockMoveMoveRels } from 'src/stock/stock-records';
import { type ActorRow } from 'src/stock/types/actor-row.type';
import { STOCK_MOVE_MOVE_REL_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER } from 'src/stock/stock-universal-identifiers.constant';
import { type MoveMoveRelRow } from 'src/stock/types/move-move-rel-row.type';

type MoveMoveRelEventRecord = MoveMoveRelRow & ActorRow;

// A removed link loses its row for good (the unique pair index would
// refuse the same link again); both moves get their state and delay alert again.
const handler = async (payload: DatabaseEventBatchPayload<ObjectRecordEvent<MoveMoveRelEventRecord>>) => {
  const { operation, events } = readEvents<MoveMoveRelEventRecord>(payload);
  const errors = errorCollector();

  if (operation === 'deleted') {
    await errors.run('destroy links', () => stockMoveMoveRels.destroySoftDeleted(events.map((event) => event.recordId)));
  }
  if (operation === 'created' || operation === 'deleted') {
    const moveIds = events
      .filter((event) => isStaffEvent(operation, event))
      .flatMap((event) => {
        const row = operation === 'created' ? eventAfter(event) : eventBefore(event);

        return row === undefined ? [] : [row.moveOrigId, row.moveDestId];
      });

    if (moveIds.length > 0) {
      await errors.run('recompute moves', () => recomputeMove([...new Set(moveIds)]));
    }
  }

  errors.throwIfAny();
  return {};
};

export default defineLogicFunction({
  universalIdentifier: STOCK_MOVE_MOVE_REL_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'platform-stock-move-move-rel',
  description: 'Recomputes both moves when a move chain link is added or removed, and removes a deleted link for good.',
  timeoutSeconds: 60,
  handler,
  databaseEventTriggerSettings: { eventName: 'stockMoveMoveRel.*', batchMode: true },
});
