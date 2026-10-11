import { type ObjectRecordEvent } from 'twenty-sdk/define';

import { nextNumber } from 'src/base/sequence/next-number';
import { type RecordOperation } from 'src/shared/triggers/batch-events';
import { type ErrorCollector } from 'src/shared/triggers/retry-on-conflict';
import { findSeedLocationId, readLocations } from 'src/stock/location/read-locations';
import { readPartnerLocations } from 'src/stock/picking/read-partner-locations';
import { isStaffEvent } from 'src/stock/stock-event-helpers';
import { STOCK_SEED_KEYS } from 'src/stock/stock-options.constant';
import { stockPickings } from 'src/stock/stock-records';
import { readPicking, readPickingType } from 'src/stock/picking/read-picking';
import { planPickingCreate, planPickingLocations } from 'src/stock/utils/plan-picking-rules.util';
import { type PickingEventRecord } from 'src/stock/picking/types/picking-event-record.type';
import { type PickingState } from 'src/stock/types/picking-state.type';
import { type PickingTypeRow } from 'src/stock/types/picking-type-row.type';

export const defaultPickingLocations = async (
  picking: { state: PickingState; returnPickingId: string | null; companyId: string | null; personId: string | null },
  type: PickingTypeRow,
) => {
  const ids = [type.defaultLocationSrcId, type.defaultLocationDestId].flatMap((id) => (id === null ? [] : [id]));
  const [locations, partner, vendorsId, customersId] = await Promise.all([
    readLocations(ids),
    readPartnerLocations(picking),
    findSeedLocationId(STOCK_SEED_KEYS.suppliers),
    findSeedLocationId(STOCK_SEED_KEYS.customers),
  ]);

  return planPickingLocations({
    state: picking.state,
    returnPickingId: picking.returnPickingId,
    source: {
      id: type.defaultLocationSrcId,
      usage: type.defaultLocationSrcId === null ? null : (locations.get(type.defaultLocationSrcId)?.usage ?? null),
    },
    destination: {
      id: type.defaultLocationDestId,
      usage: type.defaultLocationDestId === null ? null : (locations.get(type.defaultLocationDestId)?.usage ?? null),
    },
    partner,
    vendorsId,
    customersId,
  });
};

// The responsible user is the member who made the transfer; when
// the event names no member it stays empty and screens show the creator instead.
export const handlePickingCreated = async (
  events: ObjectRecordEvent<PickingEventRecord>[],
  operation: RecordOperation,
  errors: ErrorCollector,
) => {
  if (operation !== 'created') {
    return;
  }

  for (const event of events.filter((candidate) => isStaffEvent(operation, candidate))) {
    await errors.run(event.recordId, async () => {
      const picking = await readPicking(event.recordId);
      const type = await readPickingType(picking?.pickingTypeId ?? null);

      if (picking === undefined || type === undefined) {
        return;
      }
      const needsName = picking.name === null || picking.name === '';
      const nextName = needsName && type.referenceSequenceId !== null ? await nextNumber(type.referenceSequenceId) : null;
      const data = planPickingCreate({
        picking,
        typeMoveType: type.moveType,
        typeCode: type.code,
        nextName,
        locations: await defaultPickingLocations(picking, type),
        actingMemberId: event.workspaceMemberId,
      });

      await stockPickings.update(picking.id, data);
    });
  }
};
