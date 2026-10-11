import { LOCATION_USAGE } from 'src/stock/stock-options.constant';

// One rule ordered: the message names the transfer when the new move leaves
// another warehouse or comes from transit, so the user can follow it there.
export const orderSuccessMessage = ({
  orderpointCount,
  orderpointWarehouseId,
  firstMove,
}: {
  orderpointCount: number;
  orderpointWarehouseId: string | null;
  firstMove: { locationWarehouseId: string | null; locationUsage: string; pickingName: string | null } | null;
}): { message: 'interWarehouse' | 'ordered'; pickingName: string | null } => {
  if (orderpointCount !== 1 || firstMove === null || !firstMove.pickingName) {
    return { message: 'ordered', pickingName: null };
  }
  const otherWarehouse = firstMove.locationWarehouseId !== null && firstMove.locationWarehouseId !== orderpointWarehouseId;

  return otherWarehouse || firstMove.locationUsage === LOCATION_USAGE.TRANSIT
    ? { message: 'interWarehouse', pickingName: firstMove.pickingName }
    : { message: 'ordered', pickingName: null };
};
