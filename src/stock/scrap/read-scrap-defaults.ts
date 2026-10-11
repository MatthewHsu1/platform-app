import { LOCATION_USAGE } from 'src/stock/stock-options.constant';
import { stockLocations, stockWarehouses } from 'src/stock/stock-records';
import { WAREHOUSE_ROW } from 'src/stock/stock-rows';
import { type WarehouseRow } from 'src/stock/types/warehouse-row.type';

// The first warehouse by sequence, then the oldest; the oldest active inventory loss location.
export const readScrapDefaults = async () => {
  const warehouses = await stockWarehouses.find<WarehouseRow>({ active: { eq: true } }, WAREHOUSE_ROW);
  const [firstWarehouse] = [...warehouses].sort(
    (left, right) => (left.sequence ?? 0) - (right.sequence ?? 0) || left.createdAt.localeCompare(right.createdAt),
  );
  const losses = await stockLocations.find<{ id: string; createdAt: string }>(
    { usage: { eq: LOCATION_USAGE.INVENTORY }, active: { eq: true } },
    'id createdAt',
  );
  const [oldestLoss] = [...losses].sort((left, right) => left.createdAt.localeCompare(right.createdAt));

  return {
    firstWarehouseLotStockId: firstWarehouse?.lotStockId ?? null,
    oldestInventoryLocationId: oldestLoss?.id ?? null,
  };
};
