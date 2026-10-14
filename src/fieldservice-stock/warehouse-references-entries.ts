import { WAREHOUSE_REFERENCES } from 'src/stock/warehouse/rules/warehouse-delete';

// A warehouse that service orders name cannot be deleted.
WAREHOUSE_REFERENCES.push({ objectSingular: 'fsmOrder', objectPlural: 'fsmOrders', field: 'warehouseId' });
