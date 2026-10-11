import { describe, expect, it } from 'vitest';

import { type PickingState } from 'src/stock/types/picking-state.type';
import {
  RECEPTION_MIXED_STATES_MESSAGE,
  RECEPTION_NO_TRANSFERS_MESSAGE,
  receptionReportLines,
} from 'src/stock/utils/reception-report-lines.util';
import { type ReceptionMove } from 'src/stock/utils/types/reception-move.type';

const WAREHOUSE = new Set(['stock', 'shelf']);
let created = 0;
const move = (overrides: Partial<ReceptionMove> & Pick<ReceptionMove, 'id'>): ReceptionMove => {
  created += 1;
  return {
    createdAt: `2026-10-01T00:00:${String(created).padStart(2, '0')}.000Z`,
    productId: 'P',
    isStorable: true,
    state: 'CONFIRMED',
    productQty: 0,
    quantity: 0,
    date: '2026-10-08T12:00:00.000Z',
    reservationDate: '2026-10-08',
    priority: 'NORMAL',
    locationId: 'stock',
    pickingId: null,
    pickingName: null,
    pickingScheduledDate: null,
    moveOrigIds: [],
    moveDestIds: [],
    ...overrides,
  };
};
const flatten = (result: ReturnType<typeof receptionReportLines>) =>
  result.kind === 'lines'
    ? result.sources.flatMap((source) =>
        source.lines.map((line) => ({
          source: source.pickingId,
          product: line.productId,
          quantity: line.quantity,
          assignable: line.isQtyAssignable,
        })),
      )
    : result.reason;

describe('receptionReportLines with one receipt and two deliveries', () => {
  const deliveries = [
    move({ id: 'd1-p', productQty: 5, pickingId: 'D1', pickingName: 'WH/OUT/1' }),
    move({ id: 'd1-p2', productId: 'P2', productQty: 10, pickingId: 'D1', pickingName: 'WH/OUT/1' }),
    move({ id: 'd2-p', productQty: 2, pickingId: 'D2', pickingName: 'WH/OUT/2' }),
  ];
  const receiptMoves = (state: ReceptionMove['state']) => [
    move({ id: 'r-p', productQty: 15, state, locationId: 'vendors', pickingId: 'R' }),
    move({ id: 'r-p2', productId: 'P2', productQty: 5, state, locationId: 'vendors', pickingId: 'R' }),
    move({ id: 'r-p3', productId: 'P3', productQty: 5, state, locationId: 'vendors', pickingId: 'R' }),
  ];

  it('shows the draft receipt as quantities that cannot be allocated yet', () => {
    const result = receptionReportLines({
      docs: [{ id: 'R', state: 'DRAFT', pickingTypeCode: 'INCOMING' }],
      moves: [...receiptMoves('DRAFT'), ...deliveries],
      warehouseLocationIds: WAREHOUSE,
      digits: 2,
    });
    expect(result.kind === 'lines' ? result.sources.length : 0).toBe(2);
    expect(flatten(result)).toEqual([
      { source: 'D1', product: 'P', quantity: 5, assignable: false },
      { source: 'D1', product: 'P2', quantity: 5, assignable: false },
      { source: 'D2', product: 'P', quantity: 2, assignable: false },
    ]);
  });

  it('shows the same quantities as allocatable once the receipt is done', () => {
    const result = receptionReportLines({
      docs: [{ id: 'R', state: 'DONE', pickingTypeCode: 'INCOMING' }],
      moves: [
        ...receiptMoves('DONE').map((receiptMove) => ({ ...receiptMove, quantity: receiptMove.productQty })),
        ...deliveries,
      ],
      warehouseLocationIds: WAREHOUSE,
      digits: 2,
    });
    expect(flatten(result)).toEqual([
      { source: 'D1', product: 'P', quantity: 5, assignable: true },
      { source: 'D1', product: 'P2', quantity: 5, assignable: true },
      { source: 'D2', product: 'P', quantity: 2, assignable: true },
    ]);
    expect(result.kind === 'lines' && result.sources[0].lines[0].moveInIds).toEqual(['r-p']);
  });
});

describe('receptionReportLines with two receipts for one delivery', () => {
  const delivery = move({ id: 'out', productQty: 100, pickingId: 'D', pickingName: 'WH/OUT/1' });
  const docs = (first: PickingState, second: PickingState) => [
    { id: 'R1', state: first, pickingTypeCode: 'INCOMING' as const },
    { id: 'R2', state: second, pickingTypeCode: 'INCOMING' as const },
  ];
  const receipts = (first: ReceptionMove['state'], second: ReceptionMove['state']) => [
    move({ id: 'r1', productQty: 5, state: first, locationId: 'vendors', pickingId: 'R1' }),
    move({ id: 'r2', productQty: 3, state: second, locationId: 'vendors', pickingId: 'R2' }),
  ];

  it('sums two draft receipts into one line of 8 that cannot be allocated', () => {
    expect(
      flatten(
        receptionReportLines({
          docs: docs('DRAFT', 'DRAFT'),
          moves: [...receipts('DRAFT', 'DRAFT'), delivery],
          warehouseLocationIds: WAREHOUSE,
          digits: 2,
        }),
      ),
    ).toEqual([{ source: 'D', product: 'P', quantity: 8, assignable: false }]);
  });

  it('splits 5 allocatable from the confirmed receipt and 3 still draft', () => {
    expect(
      flatten(
        receptionReportLines({
          docs: docs('ASSIGNED', 'DRAFT'),
          moves: [...receipts('ASSIGNED', 'DRAFT'), delivery],
          warehouseLocationIds: WAREHOUSE,
          digits: 2,
        }),
      ),
    ).toEqual([
      { source: 'D', product: 'P', quantity: 5, assignable: true },
      { source: 'D', product: 'P', quantity: 3, assignable: false },
    ]);
  });

  it('gives one allocatable line of 8 when both are confirmed', () => {
    expect(
      flatten(
        receptionReportLines({
          docs: docs('ASSIGNED', 'ASSIGNED'),
          moves: [...receipts('ASSIGNED', 'ASSIGNED'), delivery],
          warehouseLocationIds: WAREHOUSE,
          digits: 2,
        }),
      ),
    ).toEqual([{ source: 'D', product: 'P', quantity: 8, assignable: true }]);
  });

  it('refuses done and not done transfers together', () => {
    expect(
      receptionReportLines({
        docs: docs('DONE', 'ASSIGNED'),
        moves: [...receipts('DONE', 'ASSIGNED'), delivery],
        warehouseLocationIds: WAREHOUSE,
        digits: 2,
      }),
    ).toEqual({ kind: 'refused', reason: RECEPTION_MIXED_STATES_MESSAGE });
    expect(RECEPTION_MIXED_STATES_MESSAGE).toBe(
      'This report cannot be used for done and not done transfers at the same time',
    );
  });
});

describe('receptionReportLines across warehouses', () => {
  it('ignores deliveries of another warehouse', () => {
    const result = receptionReportLines({
      docs: [{ id: 'R', state: 'DRAFT', pickingTypeCode: 'INCOMING' }],
      moves: [
        move({ id: 'r', productQty: 15, state: 'DRAFT', locationId: 'vendors', pickingId: 'R' }),
        move({ id: 'other-out', productQty: 100, locationId: 'other-stock', pickingId: 'D', pickingName: 'OTHER/OUT/1' }),
      ],
      warehouseLocationIds: WAREHOUSE,
      digits: 2,
    });
    expect(result).toEqual({ kind: 'lines', docIds: ['R'], sources: [] });
  });
});

describe('receptionReportLines for a receipt made from lines only', () => {
  it('offers nothing to allocate while that receipt is still a draft', () => {
    const result = receptionReportLines({
      docs: [{ id: 'R', state: 'DRAFT', pickingTypeCode: 'INCOMING' }],
      moves: [
        move({ id: 'in', productQty: 0, quantity: 1, state: 'DRAFT', locationId: 'vendors', pickingId: 'R' }),
        move({ id: 'out', productQty: 1, state: 'CONFIRMED', pickingId: 'D', pickingName: 'WH/OUT/1' }),
      ],
      warehouseLocationIds: WAREHOUSE,
      digits: 2,
    });
    expect(flatten(result)).toEqual([{ source: 'D', product: 'P', quantity: 1, assignable: false }]);
  });

  it('uses the done quantity of a receipt move that has no demand', () => {
    const result = receptionReportLines({
      docs: [{ id: 'R', state: 'DONE', pickingTypeCode: 'INCOMING' }],
      moves: [
        move({ id: 'in', productQty: 0, quantity: 1, state: 'DONE', locationId: 'vendors', pickingId: 'R' }),
        move({ id: 'out', productQty: 1, quantity: 1, state: 'ASSIGNED', pickingId: 'D', pickingName: 'WH/OUT/1' }),
      ],
      warehouseLocationIds: WAREHOUSE,
      digits: 2,
    });
    expect(flatten(result)).toEqual([{ source: 'D', product: 'P', quantity: 1, assignable: true }]);
  });
});

describe('receptionReportLines for a backorder still linked to a delivery', () => {
  // A receipt of 10 was allocated to a delivery of 8, then 4 were received
  // and the other 6 went to a backorder that keeps the link.
  it('shows the linked quantity as already allocated', () => {
    const result = receptionReportLines({
      docs: [{ id: 'BO', state: 'ASSIGNED', pickingTypeCode: 'INCOMING' }],
      moves: [
        move({ id: 'bo', productQty: 6, state: 'ASSIGNED', locationId: 'vendors', pickingId: 'BO', moveDestIds: ['out'] }),
        move({
          id: 'out',
          productQty: 8,
          quantity: 4,
          state: 'PARTIALLY_AVAILABLE',
          pickingId: 'D',
          pickingName: 'WH/OUT/1',
          moveOrigIds: ['done-in', 'bo'],
        }),
      ],
      warehouseLocationIds: WAREHOUSE,
      digits: 2,
    });
    expect(result.kind === 'lines' && result.sources[0].lines).toEqual([
      { productId: 'P', quantity: 6, moveOutId: 'out', moveInIds: ['bo'], isQtyAssignable: true, isAssigned: true },
    ]);
  });

  it('offers the unlinked rest of the delivery once the backorder is unlinked', () => {
    const result = receptionReportLines({
      docs: [{ id: 'BO', state: 'ASSIGNED', pickingTypeCode: 'INCOMING' }],
      moves: [
        move({ id: 'bo', productQty: 6, state: 'ASSIGNED', locationId: 'vendors', pickingId: 'BO' }),
        move({
          id: 'out-linked',
          productQty: 4,
          quantity: 4,
          state: 'ASSIGNED',
          pickingId: 'D',
          pickingName: 'WH/OUT/1',
          moveOrigIds: ['done-in'],
        }),
        move({ id: 'out-rest', productQty: 4, pickingId: 'D', pickingName: 'WH/OUT/1' }),
      ],
      warehouseLocationIds: WAREHOUSE,
      digits: 2,
    });
    expect(flatten(result)).toEqual([{ source: 'D', product: 'P', quantity: 4, assignable: true }]);
  });
});

describe('receptionReportLines refusals', () => {
  it('refuses a selection of deliveries only', () => {
    expect(
      receptionReportLines({
        docs: [{ id: 'D', state: 'CONFIRMED', pickingTypeCode: 'OUTGOING' }],
        moves: [],
        warehouseLocationIds: WAREHOUSE,
        digits: 2,
      }),
    ).toEqual({ kind: 'refused', reason: RECEPTION_NO_TRANSFERS_MESSAGE });
    expect(RECEPTION_NO_TRANSFERS_MESSAGE).toBe('No transfers selected or a delivery order selected');
  });
});
