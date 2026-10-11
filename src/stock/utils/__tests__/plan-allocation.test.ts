import { describe, expect, it } from 'vitest';

import {
  planAllocate,
  planAllocationLineWrites,
  planUnallocate,
  showAllocation,
} from 'src/stock/utils/plan-allocation.util';
import { type AllocationIn } from 'src/stock/utils/types/allocation-in.type';
import { type AllocationMoveLite } from 'src/stock/utils/types/allocation-move-lite.type';
import { type AllocationOut } from 'src/stock/utils/types/allocation-out.type';
import { type ResolvedUom } from 'src/uom/utils/types/resolved-uom.type';

const out = (overrides: Partial<AllocationOut>): AllocationOut => ({
  id: 'delivery-move',
  productId: 'P',
  productQty: 10,
  quantity: 0,
  state: 'CONFIRMED',
  reservationDate: '2026-10-08',
  pickingId: 'DELIVERY',
  referenceIds: [],
  lines: [],
  moveOrigs: [],
  ...overrides,
});
const incoming = (overrides: Partial<AllocationIn>): AllocationIn => ({
  id: 'receipt-move',
  productId: 'P',
  productQty: 4,
  quantity: 0,
  state: 'ASSIGNED',
  locationDestId: 'stock',
  destDemand: 0,
  pickingId: 'RECEIPT',
  referenceIds: [],
  isLinkedToOut: false,
  ...overrides,
});

describe('planAllocate', () => {
  it('splits a partly reserved delivery and gives its reservation to the remainder when the receipt is not done', () => {
    const plan = planAllocate({
      allocations: [
        {
          out: out({ state: 'PARTIALLY_AVAILABLE', quantity: 6, lines: [{ id: 'l1', quantityProductUom: 6, locationId: 'stock' }] }),
          quantity: 4,
          ins: [incoming({})],
        },
      ],
      digits: 2,
    });

    expect(plan).toEqual({
      splits: [{ outId: 'delivery-move', remainderQty: 6, reservationDate: '2026-10-08' }],
      lineSplits: [{ outId: 'delivery-move', lineId: 'l1', outQuantity: 0, remainderQuantity: 6 }],
      links: [{ inId: 'receipt-move', outId: 'delivery-move' }],
      makeToOrder: ['delivery-move'],
      references: [],
      assignMoveIds: ['delivery-move'],
    });
  });

  it('keeps the allocated part of the reservation on the delivery when the receipt is done', () => {
    const plan = planAllocate({
      allocations: [
        {
          out: out({ state: 'ASSIGNED', quantity: 10, lines: [{ id: 'l1', quantityProductUom: 10, locationId: 'stock' }] }),
          quantity: 4,
          ins: [incoming({ state: 'DONE', quantity: 4 })],
        },
      ],
      digits: 2,
    });

    expect(plan.splits).toEqual([{ outId: 'delivery-move', remainderQty: 6, reservationDate: '2026-10-08' }]);
    expect(plan.lineSplits).toEqual([{ outId: 'delivery-move', lineId: 'l1', outQuantity: 4, remainderQuantity: 6 }]);
  });

  it('does not link a receipt already fully allocated', () => {
    const plan = planAllocate({
      allocations: [{ out: out({ productQty: 4 }), quantity: 4, ins: [incoming({ destDemand: 4 })] }],
      digits: 2,
    });

    expect(plan.links).toEqual([]);
    expect(plan.splits).toEqual([]);
  });

  it('shares references between the two transfers', () => {
    const plan = planAllocate({
      allocations: [
        { out: out({ productQty: 4, referenceIds: ['SO1'] }), quantity: 4, ins: [incoming({ referenceIds: ['PO1'] })] },
      ],
      digits: 2,
    });

    expect(plan.references).toEqual([
      { pickingId: 'RECEIPT', referenceIds: ['SO1'] },
      { pickingId: 'DELIVERY', referenceIds: ['PO1'] },
    ]);
  });

  it('gives the second receipt linked in one run the references the first one shared with the delivery', () => {
    const plan = planAllocate({
      allocations: [
        {
          out: out({ productQty: 7, referenceIds: ['SO1'] }),
          quantity: 7,
          ins: [
            incoming({ id: 'in1', pickingId: 'R1', productQty: 4, referenceIds: ['PO1'] }),
            incoming({ id: 'in2', pickingId: 'R2', productQty: 3, referenceIds: ['PO2'] }),
          ],
        },
      ],
      digits: 2,
    });

    expect(plan.links).toEqual([
      { inId: 'in2', outId: 'delivery-move' },
      { inId: 'in1', outId: 'delivery-move' },
    ]);
    expect(plan.references).toEqual([
      { pickingId: 'R2', referenceIds: ['SO1'] },
      { pickingId: 'DELIVERY', referenceIds: ['PO2'] },
      { pickingId: 'R1', referenceIds: ['SO1', 'PO2'] },
      { pickingId: 'DELIVERY', referenceIds: ['PO1'] },
    ]);
  });
});

describe('planUnallocate', () => {
  it('unlinks the receipt and makes the delivery take from stock again', () => {
    expect(
      planUnallocate({
        out: out({ productQty: 4, state: 'WAITING', moveOrigs: [{ id: 'receipt-move', productQty: 4 }] }),
        quantity: 4,
        ins: [incoming({ isLinkedToOut: true })],
        digits: 2,
      }),
    ).toEqual({
      unlinks: [{ inId: 'receipt-move', outId: 'delivery-move' }],
      split: null,
      referencesToRemove: [],
      makeToStock: 'delivery-move',
      unreserve: 'delivery-move',
    });
  });

  it('splits off the part still linked to other receipts: 3 of 8 unallocated, 5 stay linked', () => {
    const plan = planUnallocate({
      out: out({
        productQty: 8,
        state: 'WAITING',
        moveOrigs: [
          { id: 'r1', productQty: 5 },
          { id: 'r2', productQty: 3 },
        ],
      }),
      quantity: 3,
      ins: [incoming({ id: 'r2', productQty: 3, isLinkedToOut: true })],
      digits: 2,
    });

    expect(plan.unlinks).toEqual([{ inId: 'r2', outId: 'delivery-move' }]);
    expect(plan.split).toEqual({ newDemand: 5, reservationDate: '2026-10-08', originIds: ['r1'], lineSplits: [] });
  });

  it('keeps on the linked part only as much reservation as its demand', () => {
    const plan = planUnallocate({
      out: out({
        productQty: 10,
        state: 'ASSIGNED',
        quantity: 10,
        moveOrigs: [
          { id: 'a', productQty: 5 },
          { id: 'b', productQty: 5 },
        ],
        lines: [
          { id: 'l1', quantityProductUom: 6, locationId: 'stock' },
          { id: 'l2', quantityProductUom: 4, locationId: 'stock' },
        ],
      }),
      quantity: 5,
      ins: [incoming({ id: 'b', productQty: 5, isLinkedToOut: true })],
      digits: 2,
    });

    expect(plan.split?.lineSplits).toEqual([
      { lineId: 'l1', outQuantity: 5, newQuantity: 1 },
      { lineId: 'l2', outQuantity: 0, newQuantity: 4 },
    ]);
  });
});

describe('planAllocationLineWrites', () => {
  const UOMS = new Map<string, ResolvedUom>([
    ['unit', { id: 'unit', name: 'Units', factor: 1, rootId: 'unit', parentPath: 'unit/' }],
    ['dozen', { id: 'dozen', name: 'Dozens', factor: 12, rootId: 'unit', parentPath: 'unit/dozen/' }],
  ]);
  const lines = new Map([['l1', { quantity: 1, productUomId: 'dozen', productUnitUomId: 'unit' }]]);

  it('writes the kept part of a line reserved in dozens in dozens, and the rest of the dozen on the copy', () => {
    expect(
      planAllocationLineWrites({
        splits: [{ lineId: 'l1', outMoveId: 'out', outQuantity: 4, otherMoveId: 'remainder', otherQuantity: 8 }],
        convertedSide: 'out',
        lines,
        uoms: UOMS,
        digits: 2,
        copyIdOf: (lineId) => `${lineId}-copy`,
      }),
    ).toEqual([
      { kind: 'split', lineId: 'l1', moveId: 'out', quantity: 0.33, copyId: 'l1-copy', copyMoveId: 'remainder', copyQuantity: 0.67 },
    ]);
  });

  it('writes the part sent to the new move in dozens when unallocating, and the rest stays on the delivery', () => {
    expect(
      planAllocationLineWrites({
        splits: [{ lineId: 'l1', outMoveId: 'out', outQuantity: 8, otherMoveId: 'new', otherQuantity: 4 }],
        convertedSide: 'other',
        lines,
        uoms: UOMS,
        digits: 2,
        copyIdOf: (lineId) => `${lineId}-copy`,
      }),
    ).toEqual([
      { kind: 'split', lineId: 'l1', moveId: 'out', quantity: 0.67, copyId: 'l1-copy', copyMoveId: 'new', copyQuantity: 0.33 },
    ]);
  });

  it('moves a whole line that keeps nothing on the delivery', () => {
    expect(
      planAllocationLineWrites({
        splits: [{ lineId: 'l1', outMoveId: 'out', outQuantity: 0, otherMoveId: 'remainder', otherQuantity: 12 }],
        convertedSide: 'out',
        lines,
        uoms: UOMS,
        digits: 2,
        copyIdOf: (lineId) => `${lineId}-copy`,
      }),
    ).toEqual([{ kind: 'move', lineId: 'l1', moveId: 'remainder' }]);
  });
});

describe('showAllocation', () => {
  const docs = [{ id: 'RECEIPT', state: 'ASSIGNED' as const, pickingTypeCode: 'INCOMING' as const }];
  const docMoves: AllocationMoveLite[] = [
    { id: 'in', productId: 'P', isStorable: true, state: 'ASSIGNED', productQty: 4, locationId: 'vendors', pickingId: 'RECEIPT', moveOrigIds: [] },
  ];
  const waiting: AllocationMoveLite = {
    id: 'out',
    productId: 'P',
    isStorable: true,
    state: 'CONFIRMED',
    productQty: 3,
    locationId: 'stock',
    pickingId: 'DELIVERY',
    moveOrigIds: [],
  };

  it('shows the button when a delivery of the warehouse waits for the same product', () => {
    expect(showAllocation({ docs, docMoves, otherMoves: [waiting], warehouseLocationIds: new Set(['stock']) })).toBe(true);
  });

  it('hides it on outgoing transfers and when nothing waits', () => {
    expect(
      showAllocation({
        docs: [{ ...docs[0], pickingTypeCode: 'OUTGOING' }],
        docMoves,
        otherMoves: [waiting],
        warehouseLocationIds: new Set(['stock']),
      }),
    ).toBe(false);
    expect(
      showAllocation({ docs, docMoves, otherMoves: [{ ...waiting, state: 'ASSIGNED' }], warehouseLocationIds: new Set(['stock']) }),
    ).toBe(false);
  });

  it('shows it on a done receipt when the waiting delivery is already reserved', () => {
    expect(
      showAllocation({
        docs: [{ ...docs[0], state: 'DONE' }],
        docMoves: [{ ...docMoves[0], state: 'DONE' }],
        otherMoves: [{ ...waiting, state: 'ASSIGNED' }],
        warehouseLocationIds: new Set(['stock']),
      }),
    ).toBe(true);
  });
});
