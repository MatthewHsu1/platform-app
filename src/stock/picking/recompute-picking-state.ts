import { readLocations } from 'src/stock/location/read-locations';
import { shippingWeightPatches } from 'src/stock/package/read-shipping-weight-input';
import { stockMoves, stockPickings } from 'src/stock/stock-records';
import { PICKING_ROW } from 'src/stock/stock-rows';
import { nowIso } from 'src/stock/stock-settings';
import { changedFields } from 'src/stock/utils/changed-fields.util';
import { planPickingValues } from 'src/stock/utils/plan-picking-values.util';
import { type MoveState } from 'src/stock/types/move-state.type';
import { type PickingRow } from 'src/stock/types/picking-row.type';
import { type ProcureMethod } from 'src/stock/types/procure-method.type';

type PickingMove = {
  id: string;
  pickingId: string;
  state: MoveState;
  productUomQty: number;
  procureMethod: ProcureMethod;
  locationDestId: string | null;
  date: string | null;
  dateDeadline: string | null;
  delayAlertDate: string | null;
};

// The one writer of a transfer's state, scheduled date, deadline, late flag,
// delay alert date and shipping weight. It writes only what changed.
export const recomputePickingState = async (pickingIds: string[]) => {
  const ids = [...new Set(pickingIds)];

  if (ids.length === 0) {
    return;
  }

  const [pickings, moves, weights] = await Promise.all([
    stockPickings.find<PickingRow>({ id: { in: ids } }, PICKING_ROW),
    stockMoves.find<PickingMove>(
      { pickingId: { in: ids } },
      'id pickingId state productUomQty procureMethod locationDestId date dateDeadline delayAlertDate',
    ),
    shippingWeightPatches(ids),
  ]);
  const locations = await readLocations([
    ...pickings.flatMap((picking) => (picking.locationId === null ? [] : [picking.locationId])),
    ...moves.flatMap((move) => (move.locationDestId === null ? [] : [move.locationDestId])),
  ]);
  const now = nowIso();

  for (const picking of pickings) {
    const wanted = planPickingValues({
      picking: { moveType: picking.moveType, state: picking.state, scheduledDate: picking.scheduledDate },
      locationUsage: picking.locationId === null ? null : (locations.get(picking.locationId)?.usage ?? null),
      moves: moves
        .filter((move) => move.pickingId === picking.id)
        .map((move) => ({
          ...move,
          locationDestUsage: move.locationDestId === null ? null : (locations.get(move.locationDestId)?.usage ?? null),
        })),
      now,
    });

    await stockPickings.update(picking.id, { ...changedFields(picking, wanted), ...weights.get(picking.id) });
  }
};
