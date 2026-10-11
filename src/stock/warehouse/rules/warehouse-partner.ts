import { records } from 'src/shared/triggers/records';
import { findSeedLocationId } from 'src/stock/location/read-locations';
import { eventAfter, eventChangedFields, isStaffEvent } from 'src/stock/stock-event-helpers';
import { STOCK_SEED_KEYS } from 'src/stock/stock-options.constant';
import { type WarehouseRule } from 'src/stock/warehouse/types/warehouse-rule.type';

const companies = records('company', 'companies');

// The warehouse's address company sends and receives through the
// inter-warehouse transit location.
export const handleWarehousePartner: WarehouseRule = async (events, operation, errors) => {
  if (operation !== 'created' && operation !== 'updated') {
    return;
  }
  const partnerIds = events.flatMap((event) => {
    const after = eventAfter(event);
    const partnerSet =
      operation === 'created' ? after?.partnerId != null : eventChangedFields(event, ['partnerId']).includes('partnerId');

    return after?.partnerId != null && partnerSet && isStaffEvent(operation, event) ? [after.partnerId] : [];
  });

  if (partnerIds.length === 0) {
    return;
  }
  await errors.run('partner locations', async () => {
    const transitId = await findSeedLocationId(STOCK_SEED_KEYS.transit);

    if (transitId === null) {
      return;
    }
    const partners = await companies.find<{
      id: string;
      propertyStockCustomerId: string | null;
      propertyStockSupplierId: string | null;
    }>({ id: { in: [...new Set(partnerIds)] } }, 'id propertyStockCustomerId propertyStockSupplierId');

    for (const partner of partners) {
      const data: Record<string, unknown> = {};

      if (partner.propertyStockCustomerId !== transitId) {
        data.propertyStockCustomerId = transitId;
      }
      if (partner.propertyStockSupplierId !== transitId) {
        data.propertyStockSupplierId = transitId;
      }
      if (Object.keys(data).length > 0) {
        await companies.update(partner.id, data);
      }
    }
  });
};
