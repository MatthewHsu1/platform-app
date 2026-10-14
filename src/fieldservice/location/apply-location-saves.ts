import { type ObjectRecordEvent } from 'twenty-sdk/define';

import { loadAreaLookups } from 'src/fieldservice/area/load-area-lookups';
import { FIELDSERVICE_MESSAGES } from 'src/fieldservice/fieldservice-messages.constant';
import { fsmLocations, fsmOrders } from 'src/fieldservice/fieldservice-records';
import { type AreaChain } from 'src/fieldservice/types/area-chain.type';
import { type LocationTreeRow } from 'src/fieldservice/types/location-tree-row.type';
import { ancestorIds } from 'src/fieldservice/utils/ancestor-ids.util';
import { planAreaCascade } from 'src/fieldservice/utils/plan-area-cascade.util';
import { planLocationNames } from 'src/fieldservice/utils/plan-location-names.util';
import { planOwnerInherit } from 'src/fieldservice/utils/plan-owner-inherit.util';
import { refuseRecursion } from 'src/fieldservice/utils/refuse-recursion.util';
import { isApplicationWrite } from 'src/shared/triggers/actor';
import { type RecordOperation } from 'src/shared/triggers/batch-events';
import { updatedFieldsOf } from 'src/shared/triggers/event-values';
import { putBack } from 'src/shared/triggers/put-back';
import { errorCollector } from 'src/shared/triggers/retry-on-conflict';
import { sameValue } from 'src/shared/utils/same-value.util';
import { localizedReason } from 'src/stock/stock-event-helpers';

type RawEvent = ObjectRecordEvent<Record<string, unknown>>;

type LocationRecord = LocationTreeRow &
  AreaChain & {
    ownerPersonId: string | null;
    ownerCompanyId: string | null;
  };

const SELECTION = 'id name ref direction parentId completeName completeDirection ownerPersonId ownerCompanyId territoryId branchId districtId regionId';

const sideOf = (event: RawEvent, side: 'before' | 'after') =>
  (event.properties as { before?: Record<string, unknown>; after?: Record<string, unknown> })[side] ?? null;

const textOf = (value: unknown) => (typeof value === 'string' && value !== '' ? value : null);

// After a location save: a parent that would put a location under itself is put back with a note; a new location
// without an owner takes its parent's; a new territory, branch or district fills the levels below it (unless
// written in the same save) and the orders at the location follow its service area; then every full name and
// full directions are rebuilt down the tree.
export const applyLocationSaves = async (operation: RecordOperation, events: RawEvent[]) => {
  const errors = errorCollector();
  const rows = await fsmLocations.find<LocationRecord>({}, SELECTION);
  const byId = new Map(rows.map((row) => [row.id, row]));
  const parentById = new Map(rows.map((row) => [row.id, row.parentId]));
  const lookups = await loadAreaLookups();
  const areaMoved: string[] = [];
  let putBackDone = false;

  for (const recordId of [...new Set(events.map((event) => event.recordId))]) {
    const saves = events.filter((event) => event.recordId === recordId);
    const current = byId.get(recordId);

    if (current === undefined) {
      continue;
    }
    const written = new Set(saves.flatMap((event) => updatedFieldsOf(event)));
    const staffSave = saves.some((event) => !isApplicationWrite(sideOf(event, 'after') ?? undefined));
    const before = sideOf(saves[0], 'before');

    await errors.run(recordId, async () => {
      if (operation === 'updated' && staffSave && written.has('parentId') && refuseRecursion(recordId, ancestorIds(recordId, parentById))) {
        await putBack({
          objectSingular: 'fsmLocation',
          objectPlural: 'fsmLocations',
          recordId,
          data: { parentId: textOf(before?.parentId) },
          reason: await localizedReason(saves[saves.length - 1], FIELDSERVICE_MESSAGES.locationOwnParent),
        });
        putBackDone = true;
        return;
      }
      const data: Record<string, unknown> = {};

      if (operation === 'created' && current.parentId !== null) {
        const parent = byId.get(current.parentId);
        const owner = planOwnerInherit(
          { personId: current.ownerPersonId, companyId: current.ownerCompanyId },
          parent === undefined ? null : { personId: parent.ownerPersonId, companyId: parent.ownerCompanyId },
        );

        if (!sameValue(owner.personId, current.ownerPersonId)) {
          data.ownerPersonId = owner.personId;
        }
        if (!sameValue(owner.companyId, current.ownerCompanyId)) {
          data.ownerCompanyId = owner.companyId;
        }
      }
      if (staffSave && operation !== 'restored') {
        const area = planAreaCascade({
          current,
          written: {
            location: false,
            territory: written.has('territoryId'),
            branch: written.has('branchId'),
            district: written.has('districtId'),
            region: written.has('regionId'),
          },
          locationTerritoryId: null,
          lookups,
        });

        Object.assign(data, area);
      }
      if (['territoryId', 'branchId', 'districtId', 'regionId'].some((field) => written.has(field) || field in data)) {
        areaMoved.push(recordId);
      }
      await fsmLocations.update(recordId, data);
    });
  }

  // While a loop of parents is being undone, full names wait for the put-back's own save.
  if (!putBackDone) {
    await errors.run('full names', async () => {
      for (const names of planLocationNames(rows)) {
        await fsmLocations.update(names.id, { completeName: names.completeName, completeDirection: names.completeDirection });
      }
    });
  }
  await errors.run('order service areas', () => copyAreaToOrders(areaMoved));
  errors.throwIfAny();
};

// Orders carry their location's service area; a location whose area changed hands it on.
export const copyAreaToOrders = async (locationIds: string[]) => {
  if (locationIds.length === 0) {
    return;
  }
  const locations = await fsmLocations.find<{ id: string } & AreaChain>(
    { id: { in: [...new Set(locationIds)] } },
    'id territoryId branchId districtId regionId',
  );
  const orders = await fsmOrders.find<{ id: string; locationId: string } & AreaChain>(
    { locationId: { in: locations.map((location) => location.id) } },
    'id locationId territoryId branchId districtId regionId',
  );
  const byId = new Map(locations.map((location) => [location.id, location]));

  for (const order of orders) {
    const location = byId.get(order.locationId);

    if (location === undefined) {
      continue;
    }
    const data = Object.fromEntries(
      (['territoryId', 'branchId', 'districtId', 'regionId'] as const)
        .filter((field) => !sameValue(order[field], location[field]))
        .map((field) => [field, location[field]]),
    );

    await fsmOrders.update(order.id, data);
  }
};
