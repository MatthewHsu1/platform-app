import { type ObjectRecordEvent } from 'twenty-sdk/define';

import { type OrderWarehouseInput } from 'src/fieldservice-stock/types/order-warehouse-input.type';
import { oldestActiveWarehouse } from 'src/fieldservice-stock/utils/oldest-active-warehouse.util';
import { planOrderWarehouse } from 'src/fieldservice-stock/utils/plan-order-warehouse.util';
import { fsmOrders, fsmPersons } from 'src/fieldservice/fieldservice-records';
import { CLOSED_STATUS } from 'src/fieldservice/fieldservice-options.constant';
import { closedStatusOf } from 'src/fieldservice/utils/closed-status-of.util';
import { isApplicationWrite } from 'src/shared/triggers/actor';
import { type RecordOperation } from 'src/shared/triggers/batch-events';
import { updatedFieldsOf } from 'src/shared/triggers/event-values';
import { putBack } from 'src/shared/triggers/put-back';
import { findMany } from 'src/shared/triggers/records';
import { errorCollector } from 'src/shared/triggers/retry-on-conflict';
import { localizedReason } from 'src/stock/stock-event-helpers';
import { stockWarehouses } from 'src/stock/stock-records';

type RawEvent = ObjectRecordEvent<Record<string, unknown>>;

type OrderNode = { id: string; stage: string | null; personId: string | null; warehouseId: string | null };

const WORKER_FIELDS = ['person', 'personId'];
const WAREHOUSE_FIELDS = ['warehouse', 'warehouseId'];

const sideOf = (event: RawEvent, side: 'before' | 'after') => {
  const properties = event.properties as { before?: Record<string, unknown>; after?: Record<string, unknown> };

  return properties[side] ?? null;
};

const idOf = (value: unknown) => (typeof value === 'string' && value !== '' ? value : null);

// Only a new order, and a save that set the worker or the warehouse, concern the rule.
const concerned = (operation: RecordOperation, event: RawEvent) =>
  operation === 'created' || updatedFieldsOf(event).some((field) => [...WORKER_FIELDS, ...WAREHOUSE_FIELDS].includes(field));

// After an order save: a new order without a warehouse gets the worker's default or the first warehouse (with no
// warehouse at all it is removed again, the log says why); a worker picked later fills the worker's default; a
// warehouse staff clear is put back with a note.
export const applyOrderWarehouses = async (operation: 'created' | 'updated', events: RawEvent[]): Promise<{ warnings: string[] }> => {
  const relevant = events.filter((event) => concerned(operation, event));
  const warnings: string[] = [];

  if (relevant.length === 0) {
    return { warnings };
  }
  const ids = [...new Set(relevant.map((event) => event.recordId))];
  const found = await findMany<{
    orders: OrderNode[];
    warehouses: { id: string; active: boolean | null; createdAt: string }[];
  }>({
    orders: { of: fsmOrders, filter: { id: { in: ids } }, selection: 'id stage personId warehouseId' },
    warehouses: { of: stockWarehouses, filter: {}, selection: 'id active createdAt' },
  });
  const workers = await fsmPersons.find<{ id: string; defaultWarehouseId: string | null }>(
    { id: { in: found.orders.flatMap((order) => order.personId ?? []) } },
    'id defaultWarehouseId',
  );
  const defaultOf = new Map(workers.map((worker) => [worker.id, worker.defaultWarehouseId]));
  const oldestWarehouse = oldestActiveWarehouse(found.warehouses);
  const errors = errorCollector();

  for (const order of found.orders) {
    const saves = relevant.filter((event) => event.recordId === order.id);
    const written = new Set(saves.flatMap((event) => updatedFieldsOf(event)));
    const isNew = operation === 'created';
    const input: OrderWarehouseInput = {
      created: isNew,
      staffSave: saves.some((event) => !isApplicationWrite(sideOf(event, 'after') ?? undefined)),
      warehouseBefore: isNew ? null : idOf(sideOf(saves[0], 'before')?.warehouseId),
      warehouse: order.warehouseId,
      warehouseWritten: isNew ? order.warehouseId !== null : WAREHOUSE_FIELDS.some((field) => written.has(field)),
      workerWritten: isNew ? order.personId !== null : WORKER_FIELDS.some((field) => written.has(field)),
      workerDefaultWarehouse: order.personId === null ? null : (defaultOf.get(order.personId) ?? null),
      completed: closedStatusOf(order.stage) === CLOSED_STATUS.COMPLETED,
      oldestWarehouse,
    };

    await errors.run(order.id, async () => {
      const plan = planOrderWarehouse(input);

      if (plan.kind === 'set') {
        await fsmOrders.update(order.id, { warehouseId: plan.warehouseId });
      } else if (plan.kind === 'putBack') {
        await putBack({
          objectSingular: 'fsmOrder',
          objectPlural: 'fsmOrders',
          recordId: order.id,
          data: { warehouseId: plan.warehouseId },
          reason: await localizedReason(saves[saves.length - 1], plan.reason),
        });
      } else if (plan.kind === 'refuse') {
        await fsmOrders.destroyMany([order.id]);
        warnings.push(`Service order ${order.id} was removed: ${await localizedReason(saves[saves.length - 1], plan.reason)}`);
      }
    });
  }
  errors.throwIfAny();

  return { warnings };
};
