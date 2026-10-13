import { type ObjectRecordEvent } from 'twenty-sdk/define';

import { type RecordOperation } from 'src/shared/triggers/batch-events';
import { type ErrorCollector } from 'src/shared/triggers/retry-on-conflict';
import { readMoveLinks } from 'src/stock/move/move-links';
import { recomputeMove } from 'src/stock/move/recompute-move';
import { recomputePickingState } from 'src/stock/picking/recompute-picking-state';
import { eventAfter, eventBefore, eventChangedFields, isStaffEvent } from 'src/stock/stock-event-helpers';
import { MOVE_STATE } from 'src/stock/stock-options.constant';
import { stockMoveLines, stockMoveMoveRels, stockMoves } from 'src/stock/stock-records';
import { planDeadlineShift } from 'src/stock/utils/plan-move-rules.util';
import { type DeadlineMove } from 'src/stock/utils/types/deadline-move.type';
import { type MoveEventRecord } from 'src/stock/move/types/move-event-record.type';
import { type MoveState } from 'src/stock/types/move-state.type';

// The effect of a move's date change, also run by the transfer's date rules: a done move's lines
// take its date; its destination moves' delay alerts and the transfers follow.
export const applyMoveDateChange = async (moveIds: string[]) => {
  if (moveIds.length === 0) {
    return;
  }
  const moves = await stockMoves.find<{ id: string; state: MoveState; date: string | null; pickingId: string | null }>(
    { id: { in: moveIds } },
    'id state date pickingId',
  );

  for (const move of moves.filter((candidate) => candidate.state === MOVE_STATE.DONE && candidate.date !== null)) {
    const lines = await stockMoveLines.find<{ id: string; date: string | null }>({ moveId: { eq: move.id } }, 'id date');
    const ids = lines.filter((line) => line.date !== move.date).map((line) => line.id);

    if (ids.length > 0) {
      await stockMoveLines.updateMany(ids, { date: move.date });
    }
  }
  const links = await readMoveLinks(moveIds);

  await recomputeMove([...new Set([...moveIds, ...moveIds.flatMap((id) => links.destsOf.get(id) ?? [])])]);
  await recomputePickingState([...new Set(moves.flatMap((move) => (move.pickingId === null ? [] : [move.pickingId])))]);
};

const CHAIN_LIMIT = 500;

// Reads the moves linked to the start moves, then theirs, until no new move
// shows up (bounded, so a broken chain cannot read forever).
const readChain = async (startIds: string[]) => {
  const neighbours = new Map<string, Set<string>>();
  let frontier = startIds;
  const seen = new Set(startIds);

  while (frontier.length > 0 && seen.size < CHAIN_LIMIT) {
    const links = await stockMoveMoveRels.find<{ moveOrigId: string; moveDestId: string }>(
      { or: [{ moveOrigId: { in: frontier } }, { moveDestId: { in: frontier } }] },
      'moveOrigId moveDestId',
    );
    const next: string[] = [];

    for (const link of links) {
      neighbours.set(link.moveOrigId, new Set([...(neighbours.get(link.moveOrigId) ?? []), link.moveDestId]));
      neighbours.set(link.moveDestId, new Set([...(neighbours.get(link.moveDestId) ?? []), link.moveOrigId]));
      for (const id of [link.moveOrigId, link.moveDestId]) {
        if (!seen.has(id)) {
          seen.add(id);
          next.push(id);
        }
      }
    }
    frontier = next;
  }
  const rows = await stockMoves.find<{ id: string; state: MoveState; dateDeadline: string | null; pickingId: string | null }>(
    { id: { in: [...seen] } },
    'id state dateDeadline pickingId',
  );

  return rows.map((row) => ({ ...row, neighbourIds: [...(neighbours.get(row.id) ?? [])] }));
};

export const handleMoveDates = async (
  events: ObjectRecordEvent<MoveEventRecord>[],
  operation: RecordOperation,
  errors: ErrorCollector,
) => {
  if (operation !== 'updated') {
    return;
  }
  const deadlineChanges: { moveId: string; before: string | null; after: string | null }[] = [];
  const dateChanged: string[] = [];

  for (const event of events) {
    const before = eventBefore(event);
    const after = eventAfter(event);

    if (before === undefined || after === undefined || !isStaffEvent(operation, event)) {
      continue;
    }
    const changed = eventChangedFields(event, ['dateDeadline', 'date']);

    if (changed.includes('dateDeadline')) {
      deadlineChanges.push({ moveId: event.recordId, before: before.dateDeadline, after: after.dateDeadline });
    }
    if (changed.includes('date')) {
      dateChanged.push(event.recordId);
    }
  }
  if (deadlineChanges.length > 0) {
    await errors.run('deadlines', async () => {
      const chain = await readChain(deadlineChanges.map((change) => change.moveId));
      const updates = planDeadlineShift({
        changes: deadlineChanges,
        moves: new Map<string, DeadlineMove>(chain.map((move) => [move.id, move])),
      });

      for (const [moveId, dateDeadline] of updates) {
        await stockMoves.update(moveId, { dateDeadline });
      }
      const touched = new Set([...deadlineChanges.map((change) => change.moveId), ...updates.keys()]);

      await recomputePickingState([
        ...new Set(chain.filter((move) => touched.has(move.id) && move.pickingId !== null).map((move) => move.pickingId as string)),
      ]);
    });
  }
  if (dateChanged.length > 0) {
    await errors.run('dates', () => applyMoveDateChange(dateChanged));
  }
};
