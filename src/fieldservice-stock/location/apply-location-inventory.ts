import { type ObjectRecordEvent } from 'twenty-sdk/define';

import { planLocationInventory } from 'src/fieldservice-stock/utils/plan-location-inventory.util';
import { fsmLocations } from 'src/fieldservice/fieldservice-records';
import { isApplicationWrite } from 'src/shared/triggers/actor';
import { type RecordOperation } from 'src/shared/triggers/batch-events';
import { updatedFieldsOf } from 'src/shared/triggers/event-values';
import { records } from 'src/shared/triggers/records';
import { writeGrouped } from 'src/shared/triggers/write-grouped';
import { findSeedLocationId } from 'src/stock/location/read-locations';
import { STOCK_SEED_KEYS } from 'src/stock/stock-options.constant';

type RawEvent = ObjectRecordEvent<Record<string, unknown>>;

type LocationNode = {
  id: string;
  parentId: string | null;
  inventoryLocationId: string | null;
  partnerPersonId: string | null;
  partnerCompanyId: string | null;
};

type PartnerNode = { id: string; propertyStockCustomerId: string | null };

const PARENT_FIELDS = ['parent', 'parentId'];
const INVENTORY_FIELDS = ['inventoryLocation', 'inventoryLocationId'];

const writtenBy = (event: RawEvent, fields: string[]) => updatedFieldsOf(event).some((field) => fields.includes(field));

// The app's own saves (this rule's cascade among them) are already settled.
const staffSave = (event: RawEvent) => {
  const after = (event.properties as { after?: Record<string, unknown> }).after;

  return !isApplicationWrite(after as { updatedBy?: { source?: string | null } | null } | undefined);
};

// After a location save: a location without a stock location takes its parent's, else that of the contact or
// company it was made from, else Customers; a location moved under a new parent takes the parent's; a changed
// stock location is handed to every location below it.
export const applyLocationInventory = async (operation: RecordOperation, events: RawEvent[]) => {
  const created = operation === 'created' ? events.map((event) => event.recordId) : [];
  const updated = operation === 'updated' ? events.filter(staffSave) : [];
  const parentWritten = updated.filter((event) => writtenBy(event, PARENT_FIELDS)).map((event) => event.recordId);
  const inventoryWritten = updated.filter((event) => writtenBy(event, INVENTORY_FIELDS)).map((event) => event.recordId);

  if (created.length === 0 && parentWritten.length === 0 && inventoryWritten.length === 0) {
    return;
  }
  const rows = await fsmLocations.find<LocationNode>({}, 'id parentId inventoryLocationId partnerPersonId partnerCompanyId');
  const [people, companies, defaultLocationId] = await Promise.all([
    records('person', 'people').find<PartnerNode>({ id: { in: rows.flatMap((row) => row.partnerPersonId ?? []) } }, 'id propertyStockCustomerId'),
    records('company', 'companies').find<PartnerNode>({ id: { in: rows.flatMap((row) => row.partnerCompanyId ?? []) } }, 'id propertyStockCustomerId'),
    findSeedLocationId(STOCK_SEED_KEYS.customers),
  ]);
  const partnerLocation = new Map([...people, ...companies].map((partner) => [partner.id, partner.propertyStockCustomerId]));
  const writes = planLocationInventory({
    rows: rows.map((row) => ({
      id: row.id,
      parentId: row.parentId,
      inventoryLocationId: row.inventoryLocationId,
      partnerLocationId: partnerLocation.get(row.partnerPersonId ?? row.partnerCompanyId ?? '') ?? null,
    })),
    created,
    parentWritten,
    inventoryWritten,
    defaultLocationId,
  });

  await writeGrouped(
    fsmLocations,
    writes.map((write) => ({ id: write.id, data: { inventoryLocationId: write.inventoryLocationId } })),
  );
};
