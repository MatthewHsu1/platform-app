import { isNewModule } from 'src/shared/install/utils/run-install.util';
import { recomputeLocation } from 'src/stock/location/recompute-location';
import { STOCK_INSTALL } from 'src/stock/stock-install';
import { DELIVERY_STEPS, RECEPTION_STEPS, STOCK_SEED_KEYS } from 'src/stock/stock-options.constant';
import { stockLocations, stockWarehouses } from 'src/stock/stock-records';
import { reconcileWarehouseClaimed } from 'src/stock/warehouse/reconcile-warehouse-claimed';
import { readWorkspaceDisplayName } from 'src/stock/warehouse/workspace-name';

const SEED_LOCATION_KEYS = [
  STOCK_SEED_KEYS.suppliers,
  STOCK_SEED_KEYS.customers,
  STOCK_SEED_KEYS.inventory,
  STOCK_SEED_KEYS.production,
  STOCK_SEED_KEYS.scrap,
  STOCK_SEED_KEYS.transit,
];

// After the seed rows: their full names, then the first warehouse when the
// workspace has none. Runs only when the module is new to the workspace.
export const finishStockInstall = async (previousVersion: string | undefined) => {
  if (!isNewModule(previousVersion, STOCK_INSTALL.firstVersion)) {
    return;
  }
  const seeds = await stockLocations.find<{ id: string }>({ seedKey: { in: SEED_LOCATION_KEYS } }, 'id');
  await recomputeLocation(seeds.map((seed) => seed.id));

  const existing = await stockWarehouses.find<{ id: string; viewLocationId: string | null }>({}, 'id viewLocationId');
  if (existing.length === 0) {
    const [warehouseId] = await stockWarehouses.createMany([
      {
        name: await readWorkspaceDisplayName(),
        code: 'WH',
        receptionSteps: RECEPTION_STEPS.ONE_STEP,
        deliverySteps: DELIVERY_STEPS.SHIP_ONLY,
        seedKey: STOCK_SEED_KEYS.warehouse0,
      },
    ]);
    await reconcileWarehouseClaimed(warehouseId, 'created');
    return;
  }

  // A warehouse whose first run stopped has no view location yet.
  for (const warehouse of existing.filter((row) => row.viewLocationId === null)) {
    await reconcileWarehouseClaimed(warehouse.id, 'created');
  }
};
