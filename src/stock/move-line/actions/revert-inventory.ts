import { CLAIM_HELD_MESSAGE, claimKey, openJournal, withClaim } from 'src/shared/claims/claim';
import { doneMoves } from 'src/stock/move/actions/done-moves';
import { createInventoryMoves } from 'src/stock/quant/actions/create-inventory-moves';
import { markLastCount } from 'src/stock/quant/actions/mark-last-count';
import { StockUserError } from 'src/stock/stock-errors';
import { stockMoveLines, stockMoves } from 'src/stock/stock-records';
import { MOVE_LINE_ROW } from 'src/stock/stock-rows';
import { readStockSettings } from 'src/stock/stock-settings';
import { planRevertInventory } from 'src/stock/utils/plan-revert-inventory.util';
import { type InventoryLine } from 'src/stock/utils/types/inventory-line.type';
import { type InventoryMovePlan } from 'src/stock/utils/types/inventory-move-plan.type';
import { type ClaimJournal } from 'src/shared/claims/types/claim-journal.type';
import { type MoveLineRow } from 'src/stock/types/move-line-row.type';

const readInventoryLines = async (moveLineIds: string[]): Promise<InventoryLine[]> => {
  const lines = await stockMoveLines.find<MoveLineRow>({ id: { in: moveLineIds } }, MOVE_LINE_ROW);
  const moveIds = [...new Set(lines.flatMap((line) => (line.moveId === null ? [] : [line.moveId])))];
  const moves = new Map(
    (
      await stockMoves.find<{ id: string; isInventory: boolean; reference: string | null }>(
        { id: { in: moveIds } },
        'id isInventory reference',
      )
    ).map((move) => [move.id, move]),
  );

  return lines.flatMap((line) => {
    const move = line.moveId === null ? undefined : moves.get(line.moveId);

    if (line.locationId === null || line.locationDestId === null || line.productUomId === null) {
      return [];
    }

    return [
      {
        id: line.id,
        isInventory: move?.isInventory ?? false,
        reference: move?.reference ?? null,
        productId: line.productId,
        productUomId: line.productUomId,
        quantity: line.quantity,
        quantityProductUom: line.quantityProductUom,
        locationId: line.locationId,
        locationDestId: line.locationDestId,
        lotId: line.lotId,
        packageId: line.packageId,
        resultPackageId: line.resultPackageId,
        ownerId: line.ownerId,
      },
    ];
  });
};

// `moves` null: a resume, which finishes only a run that passed its commit point; a run that stopped before it
// wrote nothing, and its claim is freed.
const runRevert = async (moves: InventoryMovePlan[] | null, journal: ClaimJournal) => {
  if (moves === null && !journal.committed) {
    return;
  }
  const plans = await journal.step<InventoryMovePlan[] | null>('revert:plan', async () => moves, async () => {});

  if (plans === null) {
    return;
  }
  await journal.commit();

  await journal.step('revert:moves', async () => true, () => createInventoryMoves(plans, { restrictToOwner: false }));
  await doneMoves(
    plans.map((plan) => plan.moveId),
    { cancelBackorder: true, journal, stepPrefix: 'revert:done' },
  );
  await journal.step('revert:last-count', async () => true, () => markLastCount(plans));
};

const revertKey = (moveLineIds: string[]) => claimKey('revert', [...moveLineIds].sort()[0]);

export const revertInventory = async (moveLineIds: string[]) => {
  const plan = planRevertInventory({
    lines: await readInventoryLines(moveLineIds),
    digits: readStockSettings().productUnitDigits,
    newId: () => crypto.randomUUID(),
  });

  if (plan.kind === 'refuse') {
    throw new StockUserError(plan.message);
  }
  const key = revertKey(moveLineIds);
  const outcome = await withClaim(key, async (runId) => runRevert(plan.moves, await openJournal(key, runId)));

  if (outcome.kind === 'held') {
    throw new StockUserError(CLAIM_HELD_MESSAGE);
  }

  return { kind: 'done', reverted: plan.moves.length };
};

export const resumeRevert = async (moveLineId: string) => {
  const key = claimKey('revert', moveLineId);

  await withClaim(key, async (runId) => runRevert(null, await openJournal(key, runId)));
};
