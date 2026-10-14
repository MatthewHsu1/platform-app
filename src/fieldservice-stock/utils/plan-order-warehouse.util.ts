import { FIELDSERVICE_STOCK_MESSAGES } from 'src/fieldservice-stock/fieldservice-stock-messages.constant';
import { type OrderWarehouseInput } from 'src/fieldservice-stock/types/order-warehouse-input.type';

type OrderWarehousePlan =
  | { kind: 'keep' }
  | { kind: 'set'; warehouseId: string }
  | { kind: 'putBack'; warehouseId: string; reason: string }
  | { kind: 'refuse'; reason: string };

// An order always has a warehouse. A new order without one takes the default of the worker it names (not when
// the order is already Completed), else the oldest active warehouse; with no warehouse at all it is refused. A
// worker picked later fills the worker's default unless the same save sets the warehouse. A warehouse staff clear
// is put back; an older order with none gets the default on its next save.
export const planOrderWarehouse = (input: OrderWarehouseInput): OrderWarehousePlan => {
  const workerFills = input.workerWritten && !input.completed ? input.workerDefaultWarehouse : null;

  if (input.created) {
    if (input.warehouse !== null) {
      return { kind: 'keep' };
    }
    const chosen = workerFills ?? input.oldestWarehouse;

    return chosen === null ? { kind: 'refuse', reason: FIELDSERVICE_STOCK_MESSAGES.noWarehouse } : { kind: 'set', warehouseId: chosen };
  }
  if (!input.staffSave) {
    return { kind: 'keep' };
  }
  if (input.warehouse === null) {
    if (input.warehouseWritten && input.warehouseBefore !== null) {
      return { kind: 'putBack', warehouseId: input.warehouseBefore, reason: FIELDSERVICE_STOCK_MESSAGES.warehouseRequired };
    }
    const chosen = workerFills ?? input.oldestWarehouse;

    return chosen === null ? { kind: 'keep' } : { kind: 'set', warehouseId: chosen };
  }
  if (workerFills !== null && !input.warehouseWritten && workerFills !== input.warehouse) {
    return { kind: 'set', warehouseId: workerFills };
  }
  return { kind: 'keep' };
};
