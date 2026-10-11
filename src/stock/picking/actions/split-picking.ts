import { CLAIM_HELD_MESSAGE, claimKey, openJournal, withClaim } from 'src/shared/claims/claim';
import { splitMoves } from 'src/stock/move/actions/split-moves';
import { createBackorder } from 'src/stock/picking/actions/create-backorder';
import { type SplitPickingDeps } from 'src/stock/picking/types/split-picking-deps.type';
import { StockUserError } from 'src/stock/stock-errors';
import { stockMoves, stockPickings } from 'src/stock/stock-records';
import { readStockSettings } from 'src/stock/stock-settings';
import { planSplitTransfer } from 'src/stock/utils/plan-split-transfer.util';
import { type SplitMove } from 'src/stock/utils/types/split-move.type';
import { type SplitTransferPlan } from 'src/stock/utils/types/split-transfer-plan.type';

type SplitOutcome =
  | { kind: 'refuse'; reason: string; values: { name: string } }
  | { kind: 'done'; backorderId: string | null }
  | null;

export const makeSplitPicking = (deps: SplitPickingDeps) => {
  // `fresh` is false for a resume, which finishes only a run that passed its commit point; a run that
  // stopped before it wrote nothing, and its claim is freed. A refusal is decided here, from a fresh
  // read, and returned so the claim is released at once.
  const runSplit = async (pickingId: string, runId: string, fresh: boolean): Promise<SplitOutcome> => {
    const journal = await deps.openJournal(claimKey('split', pickingId), runId);

    if (!fresh && !journal.committed) {
      return null;
    }
    const plan = await journal.step<SplitTransferPlan | null>(
      'split:plan',
      async () => {
        const source = await deps.readSplitSource(pickingId);

        return source === null ? null : planSplitTransfer({ name: source.name, moves: source.moves, digits: deps.digits() });
      },
      async () => {},
    );

    if (plan === null || plan.kind === 'refuse') {
      return plan;
    }
    await journal.commit();
    const newMoveIds = await deps.splitMoves(plan.splitMoveIds, journal, 'split:moves');
    const backorderMoveIds = [...newMoveIds, ...plan.zeroMoveIds];
    // With nothing named, the backorder takes every move still open, as a backorder made without a list does.
    const backorderId = await deps.createBackorder(
      pickingId,
      backorderMoveIds.length === 0 ? null : backorderMoveIds,
      journal,
      'split:backorder',
    );

    return { kind: 'done', backorderId };
  };

  const splitPicking = async (pickingIds: string[]) => {
    if (pickingIds.length !== 1) {
      throw new StockUserError('Split one transfer at a time.');
    }
    const [pickingId] = pickingIds;
    const outcome = await deps.withClaim(claimKey('split', pickingId), (runId) => runSplit(pickingId, runId, true));

    if (outcome.kind === 'held') {
      throw new StockUserError(CLAIM_HELD_MESSAGE);
    }
    if (outcome.result === null) {
      throw new StockUserError('Transfer not found.');
    }
    if (outcome.result.kind === 'refuse') {
      throw new StockUserError(outcome.result.reason, outcome.result.values);
    }

    return { backorderId: outcome.result.backorderId };
  };

  // The daily job (or a later click) finishes a stopped split from its stored plan.
  const resumeSplit = async (pickingId: string) => {
    await deps.withClaim(claimKey('split', pickingId), (runId) => runSplit(pickingId, runId, false));
  };

  return { splitPicking, resumeSplit };
};

const readSplitSource = async (pickingId: string) => {
  const [picking] = await stockPickings.find<{ id: string; name: string | null }>({ id: { eq: pickingId } }, 'id name');

  if (picking === undefined) {
    return null;
  }
  const moves = await stockMoves.find<SplitMove>({ pickingId: { eq: pickingId } }, 'id state productUomQty quantity');

  return { name: picking.name ?? '', moves };
};

export const { splitPicking, resumeSplit } = makeSplitPicking({
  digits: () => readStockSettings().productUnitDigits,
  readSplitSource,
  withClaim,
  openJournal,
  splitMoves,
  createBackorder,
});
