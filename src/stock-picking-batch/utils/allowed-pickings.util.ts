import { BATCH_STATE } from 'src/stock-picking-batch/stock-picking-batch-options.constant';
import { type BatchForCheck } from 'src/stock-picking-batch/types/batch-for-check.type';
import { type PickingForCheck } from 'src/stock-picking-batch/types/picking-for-check.type';
import { PICKING_STATE } from 'src/stock/stock-options.constant';

const JOINABLE_STATES = new Set<string>([PICKING_STATE.WAITING, PICKING_STATE.CONFIRMED, PICKING_STATE.ASSIGNED]);

// The names of the transfers that may not be in the batch.
export const incompatiblePickings = (batch: BatchForCheck, pickings: PickingForCheck[]) =>
  pickings
    .filter((picking) => {
      const stateAllowed =
        JOINABLE_STATES.has(picking.state) || (picking.state === PICKING_STATE.DRAFT && batch.state === BATCH_STATE.DRAFT);
      const typeAllowed = batch.pickingTypeId === null || batch.pickingTypeId === picking.pickingTypeId;

      return !(stateAllowed && typeAllowed);
    })
    .map((picking) => picking.name);
