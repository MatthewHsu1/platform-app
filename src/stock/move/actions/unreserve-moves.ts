import { readLocations } from 'src/stock/location/read-locations';
import { recomputeMove } from 'src/stock/move/recompute-move';
import { recomputePickingState } from 'src/stock/picking/recompute-picking-state';
import { readStockProducts } from 'src/stock/product/read-stock-products';
import { recomputeProductQuantities } from 'src/stock/product/recompute-product-quantities';
import { sourceKeyOf } from 'src/stock/quant/quant-key';
import { recomputeReserved } from 'src/stock/quant/recompute-reserved';
import { StockUserError } from 'src/stock/stock-errors';
import { LOCATION_USAGE, MOVE_STATE } from 'src/stock/stock-options.constant';
import { stockMoveLines, stockMoves } from 'src/stock/stock-records';
import { MOVE_LINE_ROW, MOVE_ROW } from 'src/stock/stock-rows';
import { type MoveLineRow } from 'src/stock/types/move-line-row.type';
import { type MoveRow } from 'src/stock/types/move-row.type';

const distinct = (ids: string[]) => [...new Set(ids)];

export const unreserveMoves = async (moveIds: string[]) => {
  if (moveIds.length === 0) {
    return;
  }

  const moves = await stockMoves.find<MoveRow>({ id: { in: distinct(moveIds) } }, MOVE_ROW);
  const destinations = await readLocations(distinct(moves.flatMap((move) => (move.locationDestId ? [move.locationDestId] : []))));
  const toUnreserve: MoveRow[] = [];

  for (const move of moves) {
    const isDoneScrap =
      move.state === MOVE_STATE.DONE && destinations.get(move.locationDestId ?? '')?.usage === LOCATION_USAGE.INVENTORY;

    // Cancelled moves sit in open transfers after a cancel; done scrap moves too.
    if (move.state === MOVE_STATE.CANCEL || isDoneScrap || move.picked) {
      continue;
    }
    if (move.state === MOVE_STATE.DONE) {
      throw new StockUserError("You cannot unreserve a stock move that has been set to 'Done'.");
    }
    toUnreserve.push(move);
  }

  if (toUnreserve.length === 0) {
    return;
  }

  const ids = toUnreserve.map((move) => move.id);
  const lines = await stockMoveLines.find<MoveLineRow>({ moveId: { in: ids } }, MOVE_LINE_ROW);
  const unpicked = lines.filter((line) => !line.picked);
  const products = await readStockProducts(distinct(unpicked.map((line) => line.productId)));

  await stockMoveLines.destroyMany(unpicked.map((line) => line.id));
  await recomputeReserved(
    distinct(unpicked.filter((line) => products.get(line.productId)?.isStorable === true).map((line) => sourceKeyOf(line))),
  );
  await recomputeMove(ids);
  await recomputePickingState(distinct(toUnreserve.flatMap((move) => (move.pickingId ? [move.pickingId] : []))));
  await recomputeProductQuantities(distinct(toUnreserve.map((move) => move.productId)));
};
