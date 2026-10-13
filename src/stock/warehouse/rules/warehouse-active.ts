import { eventAfter, eventBefore, eventChangedFields, isStaffEvent } from 'src/stock/stock-event-helpers';
import { findSome } from 'src/stock/stock-exists';
import { putBackForEvent } from 'src/stock/stock-put-back';
import { MOVE_STATE } from 'src/stock/stock-options.constant';
import { stockLocations, stockPickingTypes, stockWarehouses } from 'src/stock/stock-records';
import { WAREHOUSE_ROW } from 'src/stock/stock-rows';
import { type TypeDefaults } from 'src/stock/utils/types/type-defaults.type';
import { warehouseActiveRefusal } from 'src/stock/utils/plan-warehouse-rules.util';
import { reconcileWarehouseClaimed } from 'src/stock/warehouse/reconcile-warehouse-claimed';
import { type WarehouseRow } from 'src/stock/types/warehouse-row.type';
import { type WarehouseRule } from 'src/stock/warehouse/types/warehouse-rule.type';

const OBJECT = { objectSingular: 'stockWarehouse', objectPlural: 'stockWarehouses' } as const;
const OPEN_MOVE_STATES = [
  MOVE_STATE.DRAFT,
  MOVE_STATE.WAITING,
  MOVE_STATE.CONFIRMED,
  MOVE_STATE.PARTIALLY_AVAILABLE,
  MOVE_STATE.ASSIGNED,
];

const TYPE_DEFAULTS = 'id name active defaultLocationSrcId defaultLocationDestId';

// Archiving is refused while moves of its types are open. Archive and unarchive both rebuild the flows.
export const handleWarehouseActive: WarehouseRule = async (events, operation, errors) => {
  if (operation !== 'updated') {
    return;
  }

  for (const event of events) {
    const before = eventBefore(event);
    const after = eventAfter(event);

    if (
      before === undefined ||
      after === undefined ||
      !isStaffEvent(operation, event) ||
      !eventChangedFields(event, ['active']).includes('active')
    ) {
      continue;
    }

    await errors.run(event.recordId, async () => {
      const [stored] = await stockWarehouses.find<WarehouseRow>({ id: { eq: event.recordId } }, WAREHOUSE_ROW);

      if (stored === undefined || stored.active !== after.active) {
        return;
      }
      const ownTypes = await stockPickingTypes.find<TypeDefaults>({ warehouseId: { eq: stored.id } }, TYPE_DEFAULTS);
      const openMoves =
        ownTypes.length === 0
          ? []
          : await findSome<{ pickingTypeId: string }>(
              'stockMove',
              'stockMoves',
              { pickingTypeId: { in: ownTypes.map((type) => type.id) }, state: { in: OPEN_MOVE_STATES } },
              'pickingTypeId',
              200,
            );
      const [view] =
        stored.viewLocationId === null
          ? []
          : await stockLocations.find<{ id: string; parentPath: string | null }>(
              { id: { eq: stored.viewLocationId } },
              'id parentPath',
            );
      const underView =
        view?.parentPath == null
          ? []
          : (
              await stockLocations.find<{ id: string }>({ parentPath: { like: `${view.parentPath}%` } }, 'id')
            )
              .map((location) => location.id)
              .filter((id) => id !== view.id);
      const otherTypes =
        underView.length === 0
          ? []
          : await stockPickingTypes.find<TypeDefaults>({ defaultLocationSrcId: { in: underView } }, TYPE_DEFAULTS);
      const refusal = warehouseActiveRefusal({
        warehouseName: stored.name ?? '',
        ownTypes,
        openMoveTypeIds: openMoves.map((move) => move.pickingTypeId),
        locationIdsUnderView: underView,
        otherTypes,
      });

      if (refusal !== null) {
        await putBackForEvent({ ...OBJECT, event, data: { active: before.active }, ...refusal });
        return;
      }
      await reconcileWarehouseClaimed(stored.id, stored.active ? 'unarchived' : 'archived', {
        before: {
          name: before.name,
          code: before.code,
          receptionSteps: before.receptionSteps,
          deliverySteps: before.deliverySteps,
          active: before.active,
        },
      });
    });
  }
};
