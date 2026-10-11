import { type ObjectRecordEvent } from 'twenty-sdk/define';

import { type RecordOperation } from 'src/shared/triggers/batch-events';
import { type ErrorCollector } from 'src/shared/triggers/retry-on-conflict';
import { recomputePickingState } from 'src/stock/picking/recompute-picking-state';
import { eventAfter, eventBefore, eventChangedFields, isStaffEvent } from 'src/stock/stock-event-helpers';
import { stockMoves, stockReferenceMoveRels } from 'src/stock/stock-records';
import { type MoveEventRecord } from 'src/stock/move/types/move-event-record.type';

// A move without references takes its transfer's (the references of the
// transfer's other moves).
export const copyPickingReferences = async (moveIds: string[]) => {
  if (moveIds.length === 0) {
    return;
  }
  const moves = await stockMoves.find<{ id: string; pickingId: string | null }>({ id: { in: moveIds } }, 'id pickingId');

  for (const pickingId of new Set(moves.flatMap((move) => (move.pickingId === null ? [] : [move.pickingId])))) {
    const siblings = await stockMoves.find<{ id: string }>({ pickingId: { eq: pickingId } }, 'id');
    const links = await stockReferenceMoveRels.find<{ moveId: string; referenceId: string }>(
      { moveId: { in: siblings.map((sibling) => sibling.id) } },
      'moveId referenceId',
    );
    const referenceIds = [...new Set(links.map((link) => link.referenceId))];
    const linked = new Set(links.map((link) => link.moveId));
    const rows = moves
      .filter((move) => move.pickingId === pickingId && !linked.has(move.id))
      .flatMap((move) => referenceIds.map((referenceId) => ({ moveId: move.id, referenceId })));

    if (rows.length > 0) {
      await stockReferenceMoveRels.createMany(rows);
    }
  }
};

export const handleMovePicking = async (
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
      !eventChangedFields(event, ['pickingId']).includes('pickingId')
    ) {
      continue;
    }
    await errors.run(event.recordId, async () => {
      await copyPickingReferences([event.recordId]);
      await recomputePickingState(
        [before.pickingId, after.pickingId].flatMap((id) => (id === null ? [] : [id])),
      );
    });
  }
};
