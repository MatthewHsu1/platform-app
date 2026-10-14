import { planCurrentStockLocation } from 'src/fieldservice-equipment-stock/utils/plan-current-stock-location.util';
import { fsmEquipments } from 'src/fieldservice/fieldservice-records';
import { writeGrouped } from 'src/shared/triggers/write-grouped';
import { stockQuants } from 'src/stock/stock-records';

type EquipmentRow = { id: string; lotId: string | null; currentStockLocationId: string | null };
type QuantRow = { lotId: string; locationId: string; quantity: number; inDate: string | null; createdAt: string };

// The one writer of an equipment's current inventory location: where the newest stock of its serial is. Name the
// equipment, or the serials whose stock moved.
export const recomputeEquipmentStockLocation = async ({ equipmentIds = [], lotIds = [] }: { equipmentIds?: string[]; lotIds?: string[] }) => {
  if (equipmentIds.length === 0 && lotIds.length === 0) {
    return;
  }
  const equipments = await fsmEquipments.find<EquipmentRow>(
    { or: [{ id: { in: equipmentIds } }, { lotId: { in: lotIds } }] },
    'id lotId currentStockLocationId',
  );
  const quants = await stockQuants.find<QuantRow>(
    { lotId: { in: [...new Set(equipments.flatMap((equipment) => equipment.lotId ?? []))] } },
    'lotId locationId quantity inDate createdAt',
  );

  await writeGrouped(
    fsmEquipments,
    equipments.flatMap((equipment) => {
      const planned = planCurrentStockLocation(quants.filter((quant) => quant.lotId === equipment.lotId));

      return planned === equipment.currentStockLocationId ? [] : [{ id: equipment.id, data: { currentStockLocationId: planned } }];
    }),
  );
};
