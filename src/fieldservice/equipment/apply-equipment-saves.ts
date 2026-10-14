import { type ObjectRecordEvent } from 'twenty-sdk/define';

import { loadAreaLookups } from 'src/fieldservice/area/load-area-lookups';
import { FIELDSERVICE_MESSAGES } from 'src/fieldservice/fieldservice-messages.constant';
import { fsmEquipments, fsmLocations } from 'src/fieldservice/fieldservice-records';
import { type AreaChain } from 'src/fieldservice/types/area-chain.type';
import { ancestorIds } from 'src/fieldservice/utils/ancestor-ids.util';
import { planAreaCascade } from 'src/fieldservice/utils/plan-area-cascade.util';
import { planWarrantyEnd, warrantyDatesValid } from 'src/fieldservice/utils/plan-warranty-end.util';
import { refuseRecursion } from 'src/fieldservice/utils/refuse-recursion.util';
import { isApplicationWrite } from 'src/shared/triggers/actor';
import { updatedFieldsOf } from 'src/shared/triggers/event-values';
import { putBack } from 'src/shared/triggers/put-back';
import { errorCollector } from 'src/shared/triggers/retry-on-conflict';
import { localizedReason } from 'src/stock/stock-event-helpers';

type RawEvent = ObjectRecordEvent<Record<string, unknown>>;

type EquipmentRecord = AreaChain & {
  id: string;
  parentId: string | null;
  locationId: string | null;
  warrantyStartDate: string | null;
  warrantyEndDate: string | null;
  productWarranty: number | null;
  productWarrantyType: string | null;
};

const SELECTION = 'id parentId locationId territoryId branchId districtId regionId warrantyStartDate warrantyEndDate productWarranty productWarrantyType';

const WARRANTY_FIELDS = ['warrantyStartDate', 'warrantyEndDate', 'productWarranty', 'productWarrantyType'] as const;

const sideOf = (event: RawEvent, side: 'before' | 'after') =>
  (event.properties as { before?: Record<string, unknown>; after?: Record<string, unknown> })[side] ?? null;

// After an equipment save: a parent that would put it under itself is put back; the service area follows a new
// location, territory, branch or district; the warranty end follows a new start, length or unit; an end before the
// start is refused (a refused new equipment is removed). Returns the warnings for the function's log.
export const applyEquipmentSaves = async (operation: 'created' | 'updated', events: RawEvent[], today: string) => {
  const ids = [...new Set(events.map((event) => event.recordId))];
  const rows = await fsmEquipments.find<EquipmentRecord>({}, SELECTION);
  const parentById = new Map(rows.map((row) => [row.id, row.parentId]));
  const lookups = await loadAreaLookups();
  const locations = new Map(
    (
      await fsmLocations.find<{ id: string; territoryId: string | null }>(
        { id: { in: rows.filter((row) => ids.includes(row.id)).flatMap((row) => row.locationId ?? []) } },
        'id territoryId',
      )
    ).map((location) => [location.id, location.territoryId]),
  );
  const errors = errorCollector();
  const warnings: string[] = [];

  for (const current of rows.filter((row) => ids.includes(row.id))) {
    const saves = events.filter((event) => event.recordId === current.id);
    const isCreate = operation === 'created';
    const updated = new Set(saves.flatMap((event) => updatedFieldsOf(event)));
    const written = (field: keyof EquipmentRecord) => (isCreate ? current[field] !== null : updated.has(field));
    const staffSave = saves.some((event) => !isApplicationWrite(sideOf(event, 'after') ?? undefined));
    const before = sideOf(saves[0], 'before');
    const reasonOf = (message: string) => localizedReason(saves[saves.length - 1], message);

    await errors.run(current.id, async () => {
      if (!isCreate && staffSave && updated.has('parentId') && refuseRecursion(current.id, ancestorIds(current.id, parentById))) {
        await putBack({
          objectSingular: 'fsmEquipment',
          objectPlural: 'fsmEquipments',
          recordId: current.id,
          data: { parentId: typeof before?.parentId === 'string' ? before.parentId : null },
          reason: await reasonOf(FIELDSERVICE_MESSAGES.equipmentOwnParent),
        });
        return;
      }
      const data: Record<string, unknown> = planAreaCascade({
        current,
        written: {
          location: isCreate ? current.locationId !== null && current.territoryId === null : updated.has('locationId'),
          territory: written('territoryId'),
          branch: written('branchId'),
          district: written('districtId'),
          region: written('regionId'),
        },
        locationTerritoryId: current.locationId === null ? null : (locations.get(current.locationId) ?? null),
        lookups,
      });
      let endDate = current.warrantyEndDate;

      const endFollows = isCreate
        ? current.warrantyEndDate === null
        : WARRANTY_FIELDS.some((field) => field !== 'warrantyEndDate' && updated.has(field)) && !updated.has('warrantyEndDate');

      if (endFollows) {
        const planned = planWarrantyEnd({
          startDate: current.warrantyStartDate,
          length: current.productWarranty ?? 0,
          unit: current.productWarrantyType,
          today,
        });

        if (planned !== null && planned !== endDate) {
          endDate = planned;
          data.warrantyEndDate = planned;
        }
      }
      if ((isCreate || staffSave) && !warrantyDatesValid(current.warrantyStartDate, endDate)) {
        const reason = await reasonOf(FIELDSERVICE_MESSAGES.warrantyDates);

        if (isCreate) {
          await fsmEquipments.destroyMany([current.id]);
          warnings.push(`Equipment ${current.id} was removed: ${reason}`);
          return;
        }
        await putBack({
          objectSingular: 'fsmEquipment',
          objectPlural: 'fsmEquipments',
          recordId: current.id,
          data: Object.fromEntries(WARRANTY_FIELDS.filter((field) => updated.has(field)).map((field) => [field, before?.[field] ?? null])),
          reason,
        });
        return;
      }
      await fsmEquipments.update(current.id, data);
    });
  }
  errors.throwIfAny();

  return warnings;
};
