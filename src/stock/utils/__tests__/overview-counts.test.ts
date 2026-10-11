import { describe, expect, it } from 'vitest';

import { overviewCountFilter, overviewWarehouses } from 'src/stock/utils/overview-counts.util';
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

  it('groups the cards by warehouse, each warehouse where its first operation type falls', () => {
    const warehouses = overviewWarehouses(
      [
        type({ id: 'east-in', sequence: 3, warehouseId: 'east', warehouseName: 'East' }),
        type({ id: 'main-in', sequence: 1 }),
        type({ id: 'none', sequence: 2, warehouseId: null, warehouseName: null }),
        type({ id: 'main-out', sequence: 4 }),
      ],
      [],
    );

    expect(warehouses.map((warehouse) => [warehouse.warehouseName, warehouse.types.map((card) => card.id)])).toEqual([
      ['Main', ['main-in', 'main-out']],
      [null, ['none']],
      ['East', ['east-in']],
    ]);
  });
});
