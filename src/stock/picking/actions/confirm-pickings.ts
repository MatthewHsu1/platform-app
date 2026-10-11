import { CLAIM_HELD_MESSAGE, claimKey, openJournal, withClaim } from 'src/shared/claims/claim';
import { confirmMoves } from 'src/stock/move/actions/confirm-moves';
import { runOrderpointsForConfirmedMoves } from 'src/stock/orderpoint/run-orderpoints-for-confirmed-moves';
import { StockUserError } from 'src/stock/stock-errors';
import { recomputePickingState } from 'src/stock/picking/recompute-picking-state';
import { MOVE_STATE, PICKING_STATE } from 'src/stock/stock-options.constant';
import { stockMoves, stockPickings } from 'src/stock/stock-records';
import { PICKING_ROW } from 'src/stock/stock-rows';
import { OPEN_MOVE_STATES_FOR_FORECAST } from 'src/stock/utils/plan-product-quantities.util';
import { type PickingRow } from 'src/stock/types/picking-row.type';

// The draft moves are chosen once and stored on the claim, so a resumed
// run confirms the same moves (confirmMoves skips moves no longer draft).
// `fresh` is false for a resume. A resume finishes only a run that passed its commit
// point. A run that stopped before that point has written nothing: the resume returns
// at once and withClaim frees the claim.
const runConfirm = async (pickingId: string, runId: string, fresh: boolean) => {
  const journal = await openJournal(claimKey('confirm', pickingId), runId);

  if (!fresh && !journal.committed) {
    return;
  }
  await journal.step(
    'confirm:moves',
    async () => ({
      moveIds: (
        await stockMoves.find<{ id: string }>({ pickingId: { eq: pickingId }, state: { eq: MOVE_STATE.DRAFT } }, 'id')
      ).map((move) => move.id),
    }),
    async ({ moveIds }) => {
      await confirmMoves(moveIds, { merge: true, createProcurement: true, runId, onCommit: journal.commit, journal });
    },
  );
  await recomputePickingState([pickingId]);
  // Every running move of the transfer, the ones confirmed before included.
  await journal.step(
    'confirm:orderpoints',
    async () => ({
      moveIds: (
        await stockMoves.find<{ id: string }>({ pickingId: { eq: pickingId }, state: { in: OPEN_MOVE_STATES_FOR_FORECAST } }, 'id')
      ).map((move) => move.id),
    }),
    ({ moveIds }) => runOrderpointsForConfirmedMoves(moveIds),
  );
};

export const confirmPickings = async (pickingIds: string[]) => {
  const pickings = await stockPickings.find<PickingRow>({ id: { in: [...new Set(pickingIds)] } }, PICKING_ROW);
  const notDraft = pickings.filter((picking) => picking.state !== PICKING_STATE.DRAFT);

  if (notDraft.length > 0) {
    throw new StockUserError('Only draft transfers can be marked as to do: {names}.', {
      names: notDraft.map((picking) => picking.name ?? picking.id).join(', '),
    });
  }

  for (const picking of pickings) {
    const outcome = await withClaim(claimKey('confirm', picking.id), (runId) => runConfirm(picking.id, runId, true));

    if (outcome.kind === 'held') {
      throw new StockUserError(CLAIM_HELD_MESSAGE);
    }
  }
};

export const resumeConfirm = async (pickingId: string) => {
  await withClaim(claimKey('confirm', pickingId), (runId) => runConfirm(pickingId, runId, false));
};
