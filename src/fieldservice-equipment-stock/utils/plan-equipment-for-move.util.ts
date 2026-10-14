import { type DoneMoveLine } from 'src/fieldservice-equipment-stock/types/done-move-line.type';
import { type EquipmentToCreate } from 'src/fieldservice-equipment-stock/types/equipment-to-create.type';

// A done move makes one equipment for each serial it moved, when the product and the operation type both ask for
// it. A serial that already has equipment makes none, so a second pass finds nothing to make. The equipment takes
// the location of the order the move was made for as both its locations.
export const planEquipmentForMove = ({
  productCreates,
  pickingTypeCreates,
  lines,
  serialsWithEquipment,
  orderLocationId,
}: {
  productCreates: boolean;
  pickingTypeCreates: boolean;
  lines: DoneMoveLine[];
  serialsWithEquipment: Set<string>;
  orderLocationId: string | null;
}): EquipmentToCreate[] => {
  if (!productCreates || !pickingTypeCreates) {
    return [];
  }
  const serials = new Set(lines.filter((line) => line.lotId !== null && line.quantity > 0).map((line) => line.lotId as string));

  return [...serials].filter((lotId) => !serialsWithEquipment.has(lotId)).map((lotId) => ({ lotId, locationId: orderLocationId }));
};

// Equipment names are unique, and a serial is unique within its product.
export const planEquipmentName = (productName: string, serialName: string) => `${productName} ${serialName}`;
