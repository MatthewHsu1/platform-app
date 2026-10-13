import { QUANTITY_UPDATED_REFERENCE } from 'src/stock/utils/plan-move-values.util';
import { isZeroAtDigits } from 'src/stock/utils/stock-uom.util';
import { type InventoryLine } from 'src/stock/utils/types/inventory-line.type';
import { type InventoryMovePlan } from 'src/stock/utils/types/inventory-move-plan.type';

export const NO_INVENTORY_TO_REVERT_MESSAGE = 'There are no inventory adjustments to revert.';

// The mirror of an adjustment line: same quantity, unit, product, lot and owner,
// locations and packages swapped. The name is record data, so it stays in English. An adjustment without a name is referenced as
// a quantity update (a line that moved something is never the zero "confirmed" kind).
export const planRevertInventory = ({
  lines,
  digits,
  newId,
}: {
  lines: InventoryLine[];
  digits: number;
  newId: () => string;
}): { kind: 'refuse'; message: string } | { kind: 'moves'; moves: InventoryMovePlan[] } => {
  const revertible = lines.filter((line) => line.isInventory && !isZeroAtDigits(line.quantity, digits));

  if (revertible.length === 0) {
    return { kind: 'refuse', message: NO_INVENTORY_TO_REVERT_MESSAGE };
  }

  return {
    kind: 'moves',
    moves: revertible.map((line) => ({
      quantId: null,
      moveId: newId(),
      lineId: newId(),
      productId: line.productId,
      productUomId: line.productUomId,
      quantity: line.quantity,
      quantityProductUom: line.quantityProductUom ?? line.quantity,
      locationId: line.locationDestId,
      locationDestId: line.locationId,
      ...(line.lotId === null ? {} : { lotId: line.lotId }),
      ...(line.resultPackageId === null ? {} : { packageId: line.resultPackageId }),
      ...(line.packageId === null ? {} : { resultPackageId: line.packageId }),
      ownerId: line.ownerId,
      inventoryName: `${line.reference ?? QUANTITY_UPDATED_REFERENCE} [reverted]`,
    })),
  };
};
