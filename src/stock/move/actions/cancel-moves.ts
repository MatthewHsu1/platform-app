import { readLocations } from 'src/stock/location/read-locations';
import { unreserveMoves } from 'src/stock/move/actions/unreserve-moves';
import { readMoveLinks, unlinkMoves } from 'src/stock/move/move-links';
import { recomputeMove } from 'src/stock/move/recompute-move';
import { recomputePickingState } from 'src/stock/picking/recompute-picking-state';
import { planCancelPropagation } from 'src/stock/procurement/plan-cancel-propagation';
import { recomputeProductQuantities } from 'src/stock/product/recompute-product-quantities';
import { StockUserError } from 'src/stock/stock-errors';
import { LOCATION_USAGE, MOVE_STATE, PROCURE_METHOD } from 'src/stock/stock-options.constant';
import { stockMoveLines, stockMoves } from 'src/stock/stock-records';
import { MOVE_ROW } from 'src/stock/stock-rows';
import { type MoveRow } from 'src/stock/types/move-row.type';

const distinct = (ids: string[]) => [...new Set(ids)];

export const cancelMoves = async (moveIds: string[]): Promise<void> => {
  if (moveIds.length === 0) {
    return;
  }

  const moves = await stockMoves.find<MoveRow>({ id: { in: distinct(moveIds) } }, MOVE_ROW);
  const destinations = await readLocations(distinct(moves.flatMap((move) => (move.locationDestId ? [move.locationDestId] : []))));
  const isDoneScrap = (move: MoveRow) =>
    move.state === MOVE_STATE.DONE && destinations.get(move.locationDestId ?? '')?.usage === LOCATION_USAGE.INVENTORY;

  if (moves.some((move) => move.state === MOVE_STATE.DONE && !isDoneScrap(move))) {
    throw new StockUserError(
      "You cannot cancel a stock move that has been set to 'Done'. Create a return in order to reverse the moves which took place.",
    );
  }

  const toCancel = moves.filter((move) => move.state !== MOVE_STATE.CANCEL && !isDoneScrap(move));

  if (toCancel.length === 0) {
    return;
  }

  const ids = toCancel.map((move) => move.id);
  const pickedLines = await stockMoveLines.find<{ id: string }>({ moveId: { in: ids }, picked: { eq: true } }, 'id');

  // Unpicked, so the unreserve below removes every line of these moves.
  await stockMoves.updateMany(ids, { picked: false });
  await stockMoveLines.updateMany(pickedLines.map((line) => line.id), { picked: false });
  await unreserveMoves(ids);
  await stockMoves.updateMany(ids, { state: MOVE_STATE.CANCEL });

  const links = await readMoveLinks(ids);
  const destIds = distinct(ids.flatMap((id) => links.destsOf.get(id) ?? []));
  const destLinks = await readMoveLinks(destIds);
  const relatedIds = distinct([...ids, ...destIds, ...destIds.flatMap((id) => destLinks.origsOf.get(id) ?? [])]);
  const related = await stockMoves.find<MoveRow>({ id: { in: relatedIds } }, MOVE_ROW);
  const origsOf = (id: string) => distinct([...(links.origsOf.get(id) ?? []), ...(destLinks.origsOf.get(id) ?? [])]);
  const destsOf = (id: string) => distinct([...(links.destsOf.get(id) ?? []), ...(destLinks.destsOf.get(id) ?? [])]);
  const cancelled = new Set(ids);

  const propagation = planCancelPropagation({
    cancelled: ids,
    moves: related.map((move) => ({
      id: move.id,
      state: cancelled.has(move.id) ? MOVE_STATE.CANCEL : move.state,
      propagateCancel: move.propagateCancel,
      locationId: move.locationId,
      locationDestId: move.locationDestId,
      moveOrigIds: origsOf(move.id),
      moveDestIds: destsOf(move.id),
    })),
  });

  await stockMoves.updateMany(propagation.makeToStock, { procureMethod: PROCURE_METHOD.MAKE_TO_STOCK });
  await unlinkMoves(propagation.unlink);
  await cancelMoves(propagation.cancel.filter((id) => !cancelled.has(id)));

  // The cancelled moves lose their origin links and take from stock again.
  await unlinkMoves(ids.flatMap((id) => (links.origsOf.get(id) ?? []).map((moveOrigId) => ({ moveOrigId, moveDestId: id }))));
  await stockMoves.updateMany(ids, { procureMethod: PROCURE_METHOD.MAKE_TO_STOCK });

  // Everything whose state, links or procure method changed: the cancelled moves,
  // the moves chained to them on either side, and the ones the propagation touched.
  const changedIds = distinct([
    ...ids,
    ...relatedIds,
    ...ids.flatMap((id) => links.origsOf.get(id) ?? []),
    ...propagation.makeToStock,
    ...propagation.unlink.flatMap((pair) => [pair.moveOrigId, pair.moveDestId]),
  ]);

  await recomputeMove(changedIds);
  await recomputePickingState(
    distinct([...toCancel, ...related].flatMap((move) => (move.pickingId ? [move.pickingId] : []))),
  );
  await recomputeProductQuantities(distinct(toCancel.map((move) => move.productId)));
};
