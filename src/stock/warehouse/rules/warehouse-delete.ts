import { isStaffDelete } from 'src/shared/triggers/actor';
import { cascadeDelete } from 'src/shared/triggers/cascade-delete';
import { anyRowWhere } from 'src/stock/stock-exists';
import { RESTRICT_DELETE_MESSAGE } from 'src/stock/stock-messages';
import { restoreForEvent } from 'src/stock/stock-put-back';
import { stockPickingTypes, stockWarehouses } from 'src/stock/stock-records';
import { type WarehouseRule } from 'src/stock/warehouse/types/warehouse-rule.type';

const OBJECT = { objectSingular: 'stockWarehouse', objectPlural: 'stockWarehouses' } as const;

// Rows of other modules that name a warehouse and restrict its delete. Other modules add their own at load time.
export const WAREHOUSE_REFERENCES: { objectSingular: string; objectPlural: string; field: string }[] = [];

const usedByOtherModules = async (warehouseId: string) => {
  for (const { objectSingular, objectPlural, field } of WAREHOUSE_REFERENCES) {
    if (await anyRowWhere(objectSingular, objectPlural, { [field]: { eq: warehouseId } })) {
      return true;
    }
  }
  return false;
};

// The types go with the warehouse unless a transfer or a rule uses one. A
// rule needs its type, so a warehouse with routes, its own ones included, is
// kept: archive it instead. A warehouse another module still names is kept
// too. Its locations stay.
export const handleWarehouseDeletes: WarehouseRule = async (events, operation, errors) => {
  if (operation !== 'deleted') {
    return;
  }
  const removed: string[] = [];

  for (const event of events.filter((candidate) => isStaffDelete(candidate))) {
    await errors.run(event.recordId, async () => {
      const types = await stockPickingTypes.find<{ id: string }>({ warehouseId: { eq: event.recordId } }, 'id');
      const typeIds = types.map((type) => type.id);
      const used =
        (typeIds.length > 0 &&
          ((await anyRowWhere('stockPicking', 'stockPickings', { pickingTypeId: { in: typeIds } })) ||
            (await anyRowWhere('stockRule', 'stockRules', { pickingTypeId: { in: typeIds } })))) ||
        (await usedByOtherModules(event.recordId));

      if (used) {
        await restoreForEvent({ ...OBJECT, event, message: RESTRICT_DELETE_MESSAGE });
        return;
      }
      removed.push(event.recordId);
    });
  }
  await errors.run('operation types', () =>
    cascadeDelete({
      parents: stockWarehouses,
      parentIds: removed,
      children: [{ of: stockPickingTypes, field: 'warehouseId' }],
    }),
  );
};
