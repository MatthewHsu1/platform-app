import { type ObjectRecordEvent } from 'twenty-sdk/define';

import { copyProductWarranty } from 'src/fieldservice-equipment-stock/equipment/copy-product-warranty';
import { recomputeEquipmentStockLocation } from 'src/fieldservice-equipment-stock/equipment/recompute-equipment-stock-location';
import { updatedFieldsOf } from 'src/shared/triggers/event-values';

type RawEvent = ObjectRecordEvent<Record<string, unknown>>;

const PRODUCT_FIELDS = ['product', 'productId'];
const LOT_FIELDS = ['lot', 'lotId'];

// After an equipment save: a new or changed product gives the equipment the warranty length and unit of the
// product, and a new or changed serial gives it the location of the newest stock of that serial. Runs before the
// equipment's own save rules, which read the warranty it writes.
export const applyEquipmentStock = async (operation: 'created' | 'updated', events: RawEvent[]) => {
  const touching = (fields: string[]) =>
    events.filter((event) => operation === 'created' || updatedFieldsOf(event).some((field) => fields.includes(field))).map((event) => event.recordId);

  await copyProductWarranty({ equipmentIds: touching(PRODUCT_FIELDS) });
  await recomputeEquipmentStockLocation({ equipmentIds: touching(LOT_FIELDS) });
};
