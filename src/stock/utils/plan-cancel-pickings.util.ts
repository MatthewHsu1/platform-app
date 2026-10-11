import { PICKING_STATE } from 'src/stock/stock-options.constant';
import { type PickingState } from 'src/stock/types/picking-state.type';

// The state writer runs on moves only, so an empty transfer gets Cancelled
// written here and keeps it until a move is added.
export const planCancelPickings = ({
  pickings,
}: {
  pickings: { id: string; isLocked: boolean; state: PickingState; moveCount: number }[];
}) => ({
  lockIds: pickings.filter((picking) => !picking.isLocked).map((picking) => picking.id),
  cancelEmptyIds: pickings
    .filter((picking) => picking.moveCount === 0 && picking.state !== PICKING_STATE.CANCEL)
    .map((picking) => picking.id),
  recomputeIds: pickings.filter((picking) => picking.moveCount > 0).map((picking) => picking.id),
});
