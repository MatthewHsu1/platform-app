import { floatRound } from 'src/shared/utils/float-round.util';
import { compareAtDigits } from 'src/stock/utils/stock-uom.util';
import { type InventoryMovePlan } from 'src/stock/utils/types/inventory-move-plan.type';
import { type InventoryQuant } from 'src/stock/utils/types/inventory-quant.type';

const roundAt = (value: number, digits: number) => floatRound(value, 10 ** -digits, 'HALF-UP');

// A typed count keeps the difference stored with it (the conflict pop-up may
// have changed it); a row nobody counted is applied as a count of its stored
// counted value, 0 by default.
export const inventoryDifference = (quant: InventoryQuant, digits: number) =>
  roundAt(
    quant.inventoryQuantitySet ? (quant.inventoryDiffQuantity ?? 0) : (quant.inventoryQuantity ?? 0) - quant.quantity,
    digits,
  );

export const planInventoryMoves = ({
  quants,
  seedInventoryLocationId,
  inventoryName,
  digits,
  newId,
}: {
  quants: InventoryQuant[];
  seedInventoryLocationId: string;
  inventoryName: string | null;
  digits: number;
  newId: () => string;
}): InventoryMovePlan[] =>
  quants.map((quant) => {
    const difference = inventoryDifference(quant, digits);
    const lossLocationId = quant.propertyStockInventoryId ?? seedInventoryLocationId;
    const addsStock = compareAtDigits(difference, 0, digits) > 0;
    const quantity = Math.abs(difference);

    return {
      quantId: quant.id,
      moveId: newId(),
      lineId: newId(),
      productId: quant.productId,
      productUomId: quant.productUomId,
      quantity,
      quantityProductUom: quantity,
      locationId: addsStock ? lossLocationId : quant.locationId,
      locationDestId: addsStock ? quant.locationId : lossLocationId,
      ...(quant.lotId === null ? {} : { lotId: quant.lotId }),
      // Found stock goes into the counted row's package; missing stock leaves it.
      ...(quant.packageId === null ? {} : addsStock ? { resultPackageId: quant.packageId } : { packageId: quant.packageId }),
      ownerId: quant.ownerId,
      inventoryName,
    };
  });
