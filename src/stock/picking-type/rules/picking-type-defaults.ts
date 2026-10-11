import { type ObjectRecordEvent } from 'twenty-sdk/define';

import { type PickingTypeEventRecord } from 'src/stock/picking-type/types/picking-type-event-record.type';
import { type RecordOperation } from 'src/shared/triggers/batch-events';
import { type ErrorCollector } from 'src/shared/triggers/retry-on-conflict';
import { findSeedLocationId } from 'src/stock/location/read-locations';
import { followTypeCode } from 'src/stock/picking-type/rules/follow-type-code';
import { eventAfter, eventBefore, eventChangedFields, isStaffEvent, localizedReason } from 'src/stock/stock-event-helpers';
import { STOCK_SEED_KEYS } from 'src/stock/stock-options.constant';
import { putBackForEvent } from 'src/stock/stock-put-back';
import { irSequences, stockPickingTypes, stockWarehouses } from 'src/stock/stock-records';
import { PICKING_TYPE_ROW, WAREHOUSE_ROW } from 'src/stock/stock-rows';
import { planPickingTypeDefaults } from 'src/stock/utils/plan-picking-type-rules.util';
import { readWorkspaceDisplayName } from 'src/stock/warehouse/workspace-name';
import { type PickingTypeRow } from 'src/stock/types/picking-type-row.type';
import { type WarehouseRow } from 'src/stock/types/warehouse-row.type';

// The default locations need a warehouse; the workspace stands for the company.
export const NO_WAREHOUSE_REASON = 'Please create a warehouse for company {company}.';

const OBJECT = { objectSingular: 'stockPickingType', objectPlural: 'stockPickingTypes' } as const;

// The first warehouse by sequence, then the oldest.
export const firstWarehouse = (warehouses: WarehouseRow[]) =>
  [...warehouses].sort(
    (left, right) =>
      (left.sequence ?? Number.MAX_SAFE_INTEGER) - (right.sequence ?? Number.MAX_SAFE_INTEGER) ||
      left.createdAt.localeCompare(right.createdAt),
  )[0] ?? null;

const seedLocations = async () => ({
  vendorsId: await findSeedLocationId(STOCK_SEED_KEYS.suppliers),
  customersId: await findSeedLocationId(STOCK_SEED_KEYS.customers),
});

const readType = async (id: string) =>
  (await stockPickingTypes.find<PickingTypeRow>({ id: { eq: id } }, PICKING_TYPE_ROW))[0];

// A type staff create gets its warehouse, sequence, default locations
// and flags. The warehouse reconciler fills its own types, so app creates are skipped.
export const handlePickingTypeCreated = async (
  events: ObjectRecordEvent<PickingTypeEventRecord>[],
  operation: RecordOperation,
  errors: ErrorCollector,
) => {
  if (operation !== 'created') {
    return;
  }
  const created = events.filter((event) => isStaffEvent(operation, event));

  if (created.length === 0) {
    return;
  }
  const warehouses = await stockWarehouses.find<WarehouseRow>({}, WAREHOUSE_ROW);
  const seeds = await seedLocations();

  for (const event of created) {
    await errors.run(event.recordId, async () => {
      const type = await readType(event.recordId);

      if (type === undefined) {
        return;
      }
      const warehouse =
        type.warehouseId === null
          ? firstWarehouse(warehouses)
          : (warehouses.find((candidate) => candidate.id === type.warehouseId) ?? null);
      const plan = planPickingTypeDefaults({ mode: 'created', type, warehouse, ...seeds });

      if (plan.kind === 'refuse') {
        // A refused create never existed, so no row is left to carry a note;
        // the reason goes out as the trigger's error instead.
        await stockPickingTypes.destroyMany([type.id]);
        throw new Error(
          await localizedReason(event, NO_WAREHOUSE_REASON, { company: await readWorkspaceDisplayName() }),
        );
      }
      const data = { ...plan.data };

      if (plan.sequence !== null) {
        const [sequenceId] = await irSequences.createMany([
          { ...plan.sequence, numberNext: 1, numberIncrement: 1, active: true },
        ]);
        data.referenceSequenceId = sequenceId;
      }
      await stockPickingTypes.update(type.id, data);
    });
  }
};

// The defaults and flags, and the transfers' type of operation, follow a new type of operation.
export const handlePickingTypeCodeChanged = async (
  events: ObjectRecordEvent<PickingTypeEventRecord>[],
  operation: RecordOperation,
  errors: ErrorCollector,
) => {
  if (operation !== 'updated') {
    return;
  }
  const changed = events.filter(
    (event) => isStaffEvent(operation, event) && eventChangedFields(event, ['code']).includes('code'),
  );

  if (changed.length === 0) {
    return;
  }
  const seeds = await seedLocations();

  for (const event of changed) {
    const before = eventBefore(event);
    const after = eventAfter(event);

    await errors.run(event.recordId, async () => {
      const type = await readType(event.recordId);

      if (type === undefined || before === undefined || after === undefined || type.code !== after.code) {
        return;
      }
      const warehouses = await stockWarehouses.find<WarehouseRow>({}, WAREHOUSE_ROW);
      const warehouse =
        type.warehouseId === null
          ? firstWarehouse(warehouses)
          : (warehouses.find((candidate) => candidate.id === type.warehouseId) ?? null);
      const plan = planPickingTypeDefaults({ mode: 'codeChanged', type, warehouse, ...seeds });

      if (plan.kind === 'refuse') {
        await putBackForEvent({
          ...OBJECT,
          event,
          data: { code: before.code },
          message: NO_WAREHOUSE_REASON,
          values: { company: await readWorkspaceDisplayName() },
        });
        return;
      }
      await stockPickingTypes.update(type.id, plan.data);
      await followTypeCode(type);
    });
  }
};
