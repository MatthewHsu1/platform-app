// What one order save tells the warehouse rule. `workerWritten` is true when the save set or changed the worker
// (a new order with a worker counts); `warehouseWritten` when it set or changed the warehouse (a new order with a
// warehouse counts).
export type OrderWarehouseInput = {
  created: boolean;
  staffSave: boolean;
  warehouseBefore: string | null;
  warehouse: string | null;
  warehouseWritten: boolean;
  workerWritten: boolean;
  workerDefaultWarehouse: string | null;
  completed: boolean;
  oldestWarehouse: string | null;
};
