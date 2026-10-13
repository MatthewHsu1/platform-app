import { type ObjectRecordEvent } from 'twenty-sdk/define';

import { type RecordOperation } from 'src/shared/triggers/batch-events';
import { type ErrorCollector } from 'src/shared/triggers/retry-on-conflict';
import { findAutoBatch } from 'src/stock-picking-batch/find-auto-batch';
import { pickingsToAutoBatchForMoves } from 'src/stock-picking-batch/utils/auto-batch-moves.util';
import { type MoveEventRecord } from 'src/stock/move/types/move-event-record.type';
import { eventAfter, eventBefore } from 'src/stock/stock-event-helpers';

type MoveBatchEventRecord = MoveEventRecord & { updatedAt?: string };
type MoveEvent = ObjectRecordEvent<MoveEventRecord>;

const beforeOf = (event: MoveEvent) => {
  const before = eventBefore(event) as MoveBatchEventRecord | undefined;

  return before === undefined ? undefined : { pickingId: before.pickingId, state: before.state, updatedAt: before.updatedAt ?? '' };
};

const afterOf = (event: MoveEvent) => {
  const after = eventAfter(event) as MoveBatchEventRecord | undefined;

  if (after === undefined) {
    return undefined;
  }
  if (after.updatedAt === undefined || after.updatedAt === '') {
    throw new Error(`The move event ${event.recordId} has no updatedAt`);
  }
  return { pickingId: after.pickingId, state: after.state, updatedAt: after.updatedAt };
};

// The batch rules of moves, run last by the move trigger: a transfer that gets
// a move or a reservation looks for a batch. The transfer's own rule covers a
// transfer that becomes ready; a transfer that is not ready is skipped at once.
export const handleMoveBatchRules = async (events: MoveEvent[], operation: RecordOperation, errors: ErrorCollector) => {
  if (operation !== 'created' && operation !== 'updated') {
    return;
  }
  await errors.run('auto batch', async () => {
    const pickings = pickingsToAutoBatchForMoves(
      operation,
      events.map((event) => ({
        before: operation === 'updated' ? beforeOf(event) : undefined,
        after: afterOf(event),
      })),
    );

    for (const { pickingId, saveKey } of pickings) {
      await errors.run(`auto batch ${pickingId}`, () => findAutoBatch(pickingId, { saveKey }));
    }
  });
};
