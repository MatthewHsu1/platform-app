import { createMissingRows } from 'src/shared/claims/create-missing-rows';
import { recomputeMove } from 'src/stock/move/recompute-move';
import { MOVE_STATE, PROCURE_METHOD } from 'src/stock/stock-options.constant';
import { stockMoveLines, stockMoves } from 'src/stock/stock-records';
import { nowIso } from 'src/stock/stock-settings';
import { type InventoryMovePlan } from 'src/stock/utils/types/inventory-move-plan.type';

// Adjustment moves are made confirmed and picked, each with its one picked
// line, under the ids the journal chose; a rerun skips the rows that exist.
// A revert keeps the owner on its line only, so its move is not restricted to that owner.
export const createInventoryMoves = async (
  plans: InventoryMovePlan[],
  { restrictToOwner }: { restrictToOwner: boolean } = { restrictToOwner: true },
) => {
  if (plans.length === 0) {
    return;
  }
  const now = nowIso();

  await createMissingRows(
    stockMoves,
    plans.map((plan) => ({
      id: plan.moveId,
      data: {
        productId: plan.productId,
        productUomId: plan.productUomId,
        productUomQty: plan.quantity,
        locationId: plan.locationId,
        locationDestId: plan.locationDestId,
        restrictPartnerId: restrictToOwner ? plan.ownerId : null,
        isInventory: true,
        picked: true,
        state: MOVE_STATE.CONFIRMED,
        procureMethod: PROCURE_METHOD.MAKE_TO_STOCK,
        inventoryName: plan.inventoryName,
        date: now,
      },
    })),
  );
  await createMissingRows(
    stockMoveLines,
    plans.map((plan) => ({
      id: plan.lineId,
      data: {
        moveId: plan.moveId,
        productId: plan.productId,
        productUomId: plan.productUomId,
        quantity: plan.quantity,
        quantityProductUom: plan.quantityProductUom,
        locationId: plan.locationId,
        locationDestId: plan.locationDestId,
        lotId: plan.lotId ?? null,
        packageId: plan.packageId ?? null,
        resultPackageId: plan.resultPackageId ?? null,
        ownerId: plan.ownerId,
        picked: true,
        state: MOVE_STATE.CONFIRMED,
        date: now,
      },
    })),
  );
  await recomputeMove(plans.map((plan) => plan.moveId));
};
