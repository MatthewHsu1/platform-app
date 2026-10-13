import { MOVE_STATE } from 'src/stock/stock-options.constant';
import { type MoveState } from 'src/stock/types/move-state.type';

export const DELETE_DONE_LINE_REASON =
  'Deleting product moves after the transfer is done? Try changing the done quantity to 0 instead.';

export const planMoveLineDelete = ({ state }: { state: MoveState }) =>
  state === MOVE_STATE.DONE || state === MOVE_STATE.CANCEL
    ? ({ kind: 'restore', reason: DELETE_DONE_LINE_REASON } as const)
    : ({ kind: 'free' } as const);
