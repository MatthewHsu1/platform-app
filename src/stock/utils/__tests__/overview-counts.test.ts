import { describe, expect, it } from 'vitest';

import { overviewCountFilter, overviewListQuery, overviewWarehouses } from 'src/stock/utils/overview-counts.util';
import { type OverviewTypeRow } from 'src/stock/utils/types/overview-type-row.type';

const OPEN = ['ASSIGNED', 'WAITING', 'CONFIRMED'];

describe('overviewCountFilter', () => {
  it('counts ready transfers by the Ready state only', () => {
    expect(overviewCountFilter('ready', '2026-10-08')).toEqual({ state: { in: ['ASSIGNED'] } });
  });

  it('counts waiting transfers in Waiting or Waiting Another Operation', () => {
    expect(overviewCountFilter('waiting', '2026-10-08')).toEqual({ state: { in: ['CONFIRMED', 'WAITING'] } });
  });

  it('counts drafts and open transfers to process', () => {
    expect(overviewCountFilter('draft', '2026-10-08')).toEqual({ state: { in: ['DRAFT'] } });
    expect(overviewCountFilter('toProcess', '2026-10-08')).toEqual({ state: { in: OPEN } });
  });

  it('counts as late an open transfer scheduled before today or with a deadline issue', () => {
    expect(overviewCountFilter('late', '2026-10-08')).toEqual({
      and: [
        { state: { in: OPEN } },
        { or: [{ scheduledDate: { lt: '2026-10-08T00:00:00.000Z' } }, { hasDeadlineIssue: { eq: true } }] },
      ],
    });
  });

  it('counts open backorders only', () => {
    expect(overviewCountFilter('backorders', '2026-10-08')).toEqual({
      and: [{ state: { in: OPEN } }, { backorderId: { is: 'NOT_NULL' } }],
    });
  });
});

const type = (overrides: Partial<OverviewTypeRow> & { id: string }): OverviewTypeRow => ({
  name: overrides.id,
  sequence: 1,
  code: 'INCOMING',
  warehouseId: 'wh1',
  warehouseName: 'Main',
  ...overrides,
});

const ZERO = { ready: 0, waiting: 0, late: 0, backorders: 0, draft: 0, toProcess: 0 };

describe('overviewWarehouses', () => {
  it('shows every active operation type, with zero counts when it has no open transfer', () => {
    const [warehouse] = overviewWarehouses([type({ id: 'receipts' })], []);

    expect(warehouse.types).toEqual([{ id: 'receipts', name: 'receipts', code: 'INCOMING', counts: ZERO }]);
  });

  it('puts each count on its operation type', () => {
    const [warehouse] = overviewWarehouses(
      [type({ id: 'receipts' }), type({ id: 'deliveries', code: 'OUTGOING', sequence: 2 })],
      [
        { count: 'ready', pickingTypeId: 'receipts', total: 2 },
        { count: 'late', pickingTypeId: 'receipts', total: 1 },
        { count: 'waiting', pickingTypeId: 'deliveries', total: 3 },
        { count: 'ready', pickingTypeId: null, total: 9 },
      ],
    );

    expect(warehouse.types.map((card) => [card.id, card.counts])).toEqual([
      ['receipts', { ...ZERO, ready: 2, late: 1 }],
      ['deliveries', { ...ZERO, waiting: 3 }],
    ]);
  });

  it('orders operation types by sequence, then by id, with no sequence last', () => {
    const [warehouse] = overviewWarehouses(
      [type({ id: 'c', sequence: null }), type({ id: 'b', sequence: 5 }), type({ id: 'a', sequence: 5 }), type({ id: 'd', sequence: 1 })],
      [],
    );

    expect(warehouse.types.map((card) => card.id)).toEqual(['d', 'a', 'b', 'c']);
  });

  it('groups the cards by warehouse', () => {
    const warehouses = overviewWarehouses(
      [
        type({ id: 'east-in', sequence: 3, warehouseId: 'east', warehouseName: 'East' }),
        type({ id: 'main-in', sequence: 1 }),
        type({ id: 'none', sequence: 2, warehouseId: null, warehouseName: null }),
        type({ id: 'main-out', sequence: 4 }),
      ],
      [],
    );

    expect(warehouses).toHaveLength(3);
    expect(warehouses.map((warehouse) => [warehouse.warehouseName, warehouse.types.map((card) => card.id)])).toEqual(
      expect.arrayContaining([
        ['Main', ['main-in', 'main-out']],
        [null, ['none']],
        ['East', ['east-in']],
      ]),
    );
  });
});

const TYPE_CHIP = { pickingType: { IS: { selectedRecordIds: ['receipts'] } } };

describe('overviewListQuery', () => {
  it('opens every transfer of the operation type from its name', () => {
    expect(overviewListQuery(null, 'receipts', 'view-receipts')).toEqual({ viewId: 'view-receipts', filter: TYPE_CHIP });
  });

  it('opens the ready transfers of the type', () => {
    expect(overviewListQuery('ready', 'receipts', 'view-ready')).toEqual({
      viewId: 'view-ready',
      filter: { state: { IS: ['ASSIGNED'] }, ...TYPE_CHIP },
    });
  });

  it('opens the open backorders of the type', () => {
    expect(overviewListQuery('backorders', 'receipts', 'view-backorders')).toEqual({
      viewId: 'view-backorders',
      filter: { state: { IS: OPEN }, ...TYPE_CHIP, backorder: { IS_NOT_EMPTY: '' } },
    });
  });

  it('opens the open transfers of the type with a deadline issue, a passed deadline or a passed scheduled date', () => {
    expect(overviewListQuery('late', 'receipts', 'view-late')).toEqual({
      viewId: 'view-late',
      filter: { state: { IS: OPEN }, ...TYPE_CHIP },
      filterGroup: {
        operator: 'OR',
        filters: [
          { field: 'hasDeadlineIssue', op: 'IS', value: 'true' },
          { field: 'dateDeadline', op: 'IS_IN_PAST', value: '' },
          { field: 'scheduledDate', op: 'IS_IN_PAST', value: '' },
        ],
      },
    });
  });

  it('opens the list without a view when the saved list is not found', () => {
    expect(overviewListQuery('draft', 'receipts', undefined)).toEqual({ filter: { state: { IS: ['DRAFT'] }, ...TYPE_CHIP } });
  });
});
