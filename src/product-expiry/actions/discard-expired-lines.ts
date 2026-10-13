import { planDiscardExpired } from 'src/product-expiry/utils/expiry-confirmation.util';
import { EXPIRY_LINE_SELECTION, toExpiryLine } from 'src/product-expiry/utils/expiry-line.util';
import { requireData, twentyGraphql } from 'src/shared/twenty-graphql';
import { freeDeletedOpenLines } from 'src/stock/move-line/rules/move-line-deletes';
import { readRequestedPickingIds } from 'src/stock/picking/actions/read-requested-picking-ids';
import { StockUserError } from 'src/stock/stock-errors';
import { MOVE_STATE } from 'src/stock/stock-options.constant';
import { stockMoveLines } from 'src/stock/stock-records';
import { MOVE_LINE_ROW } from 'src/stock/stock-rows';
import { type ExpiryLineNode } from 'src/product-expiry/types/expiry-line-node.type';
import { type MoveLineRow } from 'src/stock/types/move-line-row.type';

// Twenty's MUTATION_MAXIMUM_AFFECTED_RECORDS default.
const DELETE_CHUNK = 100;

// The expired lines are deleted as the clicking user, so their row rules decide what goes. The stock they held is
// freed here rather than left to the move-line trigger, because the pop-up validates again right away.
export const discardExpiredLines = async (body: Record<string, unknown>) => {
  const pickingIds = await readRequestedPickingIds(body);
  const lines = await stockMoveLines.find<ExpiryLineNode & MoveLineRow>(
    { pickingId: { in: pickingIds }, not: { state: { in: [MOVE_STATE.DONE, MOVE_STATE.CANCEL] } } },
    `${EXPIRY_LINE_SELECTION} ${MOVE_LINE_ROW}`,
  );
  const lineIds = planDiscardExpired(lines.map(toExpiryLine), new Date());
  const deletedLineIds: string[] = [];

  for (let start = 0; start < lineIds.length; start += DELETE_CHUNK) {
    const deleted = requireData(
      await twentyGraphql<{ deleteStockMoveLines: { id: string }[] | null }>(
        'person',
        `mutation DiscardExpiredLines($filter: StockMoveLineFilterInput!) { deleteStockMoveLines(filter: $filter) { id } }`,
        { filter: { id: { in: lineIds.slice(start, start + DELETE_CHUNK) } } },
      ),
      'Delete the expired lines',
    );
    deletedLineIds.push(...(deleted.deleteStockMoveLines ?? []).map((row) => row.id));
  }

  const deleted = new Set(deletedLineIds);

  try {
    await freeDeletedOpenLines(lines.filter((line) => deleted.has(line.id)));
  } catch (error) {
    // The lines are gone; the move-line trigger frees their stock on its own run.
    throw new StockUserError(
      'The expired lines were removed, but freeing the stock they held failed: {reason}. Validate again in a moment.',
      { reason: error instanceof Error ? error.message : String(error) },
      { deletedLineIds },
    );
  }
  return { deletedLineIds };
};
