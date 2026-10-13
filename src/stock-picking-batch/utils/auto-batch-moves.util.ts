import { type RecordOperation } from 'src/shared/triggers/batch-events';
import { MOVE_STATE } from 'src/stock/stock-options.constant';

type MoveValues = { pickingId: string | null; state: string; updatedAt: string };

const RESERVED_STATES: string[] = [MOVE_STATE.ASSIGNED, MOVE_STATE.PARTIALLY_AVAILABLE];

// A move added to a transfer, or a move that gets reserved, sends its transfer
// looking for a batch, even a transfer that was already ready: one taken out
// of its batch is batched again. One look per transfer, keyed by its latest
// move save.
export const pickingsToAutoBatchForMoves = (
  operation: RecordOperation,
  moves: { before?: MoveValues; after?: MoveValues }[],
) => {
  const latest = new Map<string, string>();

  for (const { before, after } of moves) {
    if (after === undefined || after.pickingId === null) {
      continue;
    }
    const added = operation === 'created' || (operation === 'updated' && before?.pickingId !== after.pickingId);
    const reserved = operation === 'updated' && before?.state !== after.state && RESERVED_STATES.includes(after.state);

    if (added || reserved) {
      const known = latest.get(after.pickingId);

      latest.set(after.pickingId, known !== undefined && known > after.updatedAt ? known : after.updatedAt);
    }
  }
  return [...latest].map(([pickingId, saveKey]) => ({ pickingId, saveKey }));
};
