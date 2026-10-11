import { PICKING_STATE } from 'src/stock/stock-options.constant';
import { type PickingState } from 'src/stock/types/picking-state.type';
import { type OverviewCount } from 'src/stock/utils/types/overview-count.type';
import { type OverviewCountGroup } from 'src/stock/utils/types/overview-count-group.type';
import { type OverviewCounts } from 'src/stock/utils/types/overview-counts.type';
import { type OverviewTypeRow } from 'src/stock/utils/types/overview-type-row.type';
import { type OverviewWarehouse } from 'src/stock/utils/types/overview-warehouse.type';

const OPEN_STATES: PickingState[] = [PICKING_STATE.ASSIGNED, PICKING_STATE.WAITING, PICKING_STATE.CONFIRMED];

export const OVERVIEW_COUNTS: OverviewCount[] = ['ready', 'waiting', 'late', 'backorders', 'draft', 'toProcess'];

// The states each count holds. None holds a done or cancelled transfer.
export const OVERVIEW_COUNT_STATES: Record<OverviewCount, PickingState[]> = {
  ready: [PICKING_STATE.ASSIGNED],
  waiting: [PICKING_STATE.CONFIRMED, PICKING_STATE.WAITING],
  late: OPEN_STATES,
  backorders: OPEN_STATES,
  draft: [PICKING_STATE.DRAFT],
  toProcess: OPEN_STATES,
};

// "Before today" means before today's date at midnight UTC.
export const overviewCountFilter = (count: OverviewCount, today: string): Record<string, unknown> => {
  const states = { state: { in: OVERVIEW_COUNT_STATES[count] } };

  if (count === 'late') {
    return {
      and: [states, { or: [{ scheduledDate: { lt: `${today}T00:00:00.000Z` } }, { hasDeadlineIssue: { eq: true } }] }],
    };
  }
  if (count === 'backorders') {
    return { and: [states, { backorderId: { is: 'NOT_NULL' } }] };
  }
  return states;
};

const emptyCounts = (): OverviewCounts => ({ ready: 0, waiting: 0, late: 0, backorders: 0, draft: 0, toProcess: 0 });

const bySequenceThenId = (left: OverviewTypeRow, right: OverviewTypeRow) => {
  if (left.sequence !== right.sequence) {
    if (left.sequence === null) {
      return 1;
    }
    if (right.sequence === null) {
      return -1;
    }
    return left.sequence - right.sequence;
  }
  return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
};

// One card per operation type, grouped by warehouse; each warehouse sits where
// its first operation type falls in the operation type order.
export const overviewWarehouses = (types: OverviewTypeRow[], groups: OverviewCountGroup[]): OverviewWarehouse[] => {
  const countsByType = new Map<string, OverviewCounts>();

  for (const group of groups) {
    if (group.pickingTypeId === null) {
      continue;
    }
    const counts = countsByType.get(group.pickingTypeId) ?? emptyCounts();

    counts[group.count] += group.total;
    countsByType.set(group.pickingTypeId, counts);
  }

  const warehouses = new Map<string | null, OverviewWarehouse>();

  for (const type of [...types].sort(bySequenceThenId)) {
    const warehouse = warehouses.get(type.warehouseId) ?? { warehouseId: type.warehouseId, warehouseName: type.warehouseName, types: [] };

    warehouse.types.push({ id: type.id, name: type.name, code: type.code, counts: countsByType.get(type.id) ?? emptyCounts() });
    warehouses.set(type.warehouseId, warehouse);
  }

  return [...warehouses.values()];
};

const typeChip = (typeId: string) => ({ pickingType: { IS: { selectedRecordIds: [typeId] } } });

// The query of the transfer list a card opens: every transfer of the type
// (`count` null), or the transfers of one count. Twenty replaces a saved view's
// filters with the ones in the URL, so every condition of the count is in the
// URL; the view only gives the list its name, columns and sort.
export const overviewListQuery = (count: OverviewCount | null, typeId: string, viewId: string | undefined) => {
  const view = viewId === undefined ? {} : { viewId };

  if (count === null) {
    return { ...view, filter: typeChip(typeId) };
  }
  const filter = { state: { IS: OVERVIEW_COUNT_STATES[count] }, ...typeChip(typeId) };

  if (count === 'backorders') {
    return { ...view, filter: { ...filter, backorder: { IS_NOT_EMPTY: '' } } };
  }
  if (count === 'late') {
    return {
      ...view,
      filter,
      filterGroup: {
        operator: 'OR',
        filters: [
          { field: 'hasDeadlineIssue', op: 'IS', value: 'true' },
          { field: 'dateDeadline', op: 'IS_IN_PAST', value: '' },
          { field: 'scheduledDate', op: 'IS_IN_PAST', value: '' },
        ],
      },
    };
  }
  return { ...view, filter };
};
