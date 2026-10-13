import { type ObjectRecordEvent } from 'twenty-sdk/define';

import { type RecordOperation } from 'src/shared/triggers/batch-events';
import { type ErrorCollector } from 'src/shared/triggers/retry-on-conflict';
import { readLocations } from 'src/stock/location/read-locations';
import { recomputeMove } from 'src/stock/move/recompute-move';
import { applyMoveLocationChange } from 'src/stock/move/rules/move-locations';
import { defaultPickingLocations } from 'src/stock/picking/rules/picking-created';
import { readPicking, readPickingType } from 'src/stock/picking/read-picking';
import { eventAfter, eventChangedFields, isStaffEvent } from 'src/stock/stock-event-helpers';
import { PICKING_STATE } from 'src/stock/stock-options.constant';
import { stockMoves, stockPickings } from 'src/stock/stock-records';
import { planPickingPropagation } from 'src/stock/utils/plan-picking-rules.util';
import { type PropagatedField } from 'src/stock/types/propagated-field.type';
import { type PickingEventRecord } from 'src/stock/picking/types/picking-event-record.type';
import { type MoveState } from 'src/stock/types/move-state.type';

const PROPAGATED: PropagatedField[] = ['locationId', 'locationDestId', 'companyId', 'personId'];

// The transfer's locations and contact are written onto its moves (scrap
// moves keep theirs); a move whose locations change goes through the move location rule.
export const propagatePickingChanges = async (
  pickingId: string,
  changed: Partial<Record<PropagatedField, string | null>>,
) => {
  if (Object.keys(changed).length === 0) {
    return;
  }
  const moves = await stockMoves.find<{ id: string; state: MoveState } & Record<PropagatedField, string | null>>(
    { pickingId: { eq: pickingId } },
    'id state locationId locationDestId companyId personId',
  );
  const destinations = await readLocations(
    [...new Set(moves.flatMap((move) => (move.locationDestId === null ? [] : [move.locationDestId])))],
  );
  const plan = planPickingPropagation({
    changed,
    moves: moves.map((move) => ({
      ...move,
      locationDestUsage: move.locationDestId === null ? null : (destinations.get(move.locationDestId)?.usage ?? null),
    })),
  });

  for (const { id, data } of plan) {
    await stockMoves.update(id, data);
  }
  const locationChanges = plan
    .filter(({ data }) => 'locationId' in data || 'locationDestId' in data)
    .map(({ id, data }) => ({ moveId: id, sourceChanged: 'locationId' in data, destinationChanged: 'locationDestId' in data }));

  if (locationChanges.length > 0) {
    await applyMoveLocationChange(locationChanges);
  } else if (plan.length > 0) {
    await recomputeMove(plan.map(({ id }) => id));
  }
};

// A new contact recomputes the default locations unless the same save
// also set a location (the typed value wins, as on create).
export const handlePickingPropagation = async (
  events: ObjectRecordEvent<PickingEventRecord>[],
  operation: RecordOperation,
  errors: ErrorCollector,
) => {
  if (operation !== 'updated') {
    return;
  }

  for (const event of events) {
    const after = eventAfter(event);
    const changed = eventChangedFields(event, PROPAGATED);

    if (after === undefined || changed.length === 0 || !isStaffEvent(operation, event)) {
      continue;
    }
    await errors.run(event.recordId, async () => {
      const picking = await readPicking(event.recordId);

      if (picking === undefined || changed.some((field) => picking[field] !== after[field])) {
        return;
      }
      const values: Partial<Record<PropagatedField, string | null>> = Object.fromEntries(
        changed.map((field) => [field, picking[field]]),
      );
      const contactOnly = !changed.includes('locationId') && !changed.includes('locationDestId');

      if (contactOnly && picking.state !== PICKING_STATE.DONE && picking.state !== PICKING_STATE.CANCEL) {
        const type = await readPickingType(picking.pickingTypeId);
        const locations = type === undefined ? null : await defaultPickingLocations(picking, type);
        const data: Record<string, unknown> = {};

        if (locations !== null && locations.locationId !== null && locations.locationId !== picking.locationId) {
          data.locationId = locations.locationId;
          values.locationId = locations.locationId;
        }
        if (locations !== null && locations.locationDestId !== null && locations.locationDestId !== picking.locationDestId) {
          data.locationDestId = locations.locationDestId;
          values.locationDestId = locations.locationDestId;
        }
        await stockPickings.update(picking.id, data);
      }
      await propagatePickingChanges(picking.id, values);
    });
  }
};

// Moves follow the transfer's priority; their reservation date depends on it.
export const handlePickingPriority = async (
  events: ObjectRecordEvent<PickingEventRecord>[],
  operation: RecordOperation,
  errors: ErrorCollector,
) => {
  if (operation !== 'updated') {
    return;
  }

  for (const event of events) {
    if (!isStaffEvent(operation, event) || !eventChangedFields(event, ['priority']).includes('priority')) {
      continue;
    }
    await errors.run(event.recordId, async () => {
      const picking = await readPicking(event.recordId);

      if (picking === undefined) {
        return;
      }
      const moves = await stockMoves.find<{ id: string; priority: string }>({ pickingId: { eq: picking.id } }, 'id priority');
      const ids = moves.filter((move) => move.priority !== picking.priority).map((move) => move.id);

      if (ids.length > 0) {
        await stockMoves.updateMany(ids, { priority: picking.priority });
        await recomputeMove(ids);
      }
    });
  }
};
