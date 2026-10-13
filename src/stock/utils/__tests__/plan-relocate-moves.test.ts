import { describe, expect, it } from 'vitest';

import { planMoveQuants, planRelocateMoves } from 'src/stock/utils/plan-relocate-moves.util';
import { type RelocateQuant } from 'src/stock/utils/types/relocate-quant.type';

const sequentialIds = () => {
  let next = 0;
  return () => {
    next += 1;
    return `id-${next}`;
  };
};

const quant = (overrides: Partial<RelocateQuant>): RelocateQuant => ({
  id: 'quant',
  productId: 'product',
  productUomId: 'units',
  locationId: 'stock',
  lotId: null,
  packageId: null,
  ownerId: null,
  quantity: 10,
  ...overrides,
});

describe('planRelocateMoves', () => {
  it('moves the whole quant of 10 to the chosen shelf as an adjustment named "Quantity Relocated"', () => {
    expect(planRelocateMoves({ quants: [quant({})], destinationId: 'shelf-2', reason: null, newId: sequentialIds() })).toEqual({
      kind: 'moves',
      moves: [
        {
          quantId: 'quant',
          moveId: 'id-1',
          lineId: 'id-2',
          productId: 'product',
          productUomId: 'units',
          quantity: 10,
          quantityProductUom: 10,
          locationId: 'stock',
          locationDestId: 'shelf-2',
          ownerId: null,
          inventoryName: 'Quantity Relocated',
        },
      ],
    });
  });

  it('uses the reason typed in the pop-up as the name', () => {
    const plan = planRelocateMoves({ quants: [quant({})], destinationId: 'shelf-2', reason: 'Reorganised aisle 4', newId: sequentialIds() });

    expect(plan.kind === 'moves' && plan.moves[0].inventoryName).toBe('Reorganised aisle 4');
  });

  it('refuses when a selected quant holds nothing or less than nothing', () => {
    expect(
      planRelocateMoves({ quants: [quant({}), quant({ id: 'empty', quantity: 0 })], destinationId: 'shelf-2', reason: null, newId: sequentialIds() }),
    ).toEqual({
      kind: 'refuse',
      message: 'You can only move positive quantities stored in locations used by a single company per relocation.',
    });
  });

  it('does nothing when no destination is chosen', () => {
    expect(planRelocateMoves({ quants: [quant({})], destinationId: null, reason: null, newId: sequentialIds() })).toEqual({ kind: 'nothing' });
  });
});

describe('planMoveQuants', () => {
  it('keeps each quant in its own location when no destination is given (used by unpack)', () => {
    expect(planMoveQuants({ quants: [quant({})], destinationId: null, reason: null, newId: sequentialIds() })[0]).toMatchObject({
      locationId: 'stock',
      locationDestId: 'stock',
    });
  });
});

describe('planMoveQuants with a lot', () => {
  it('moves a lot row with its lot', () => {
    const [move] = planMoveQuants({ quants: [quant({ lotId: 'lot1' })], destinationId: 'shelf-2', reason: null, newId: sequentialIds() });

    expect(move).toMatchObject({ lotId: 'lot1', locationId: 'stock', locationDestId: 'shelf-2', quantity: 10 });
  });
});

describe('planMoveQuants with a package', () => {
  it('moves a packed row in its package', () => {
    const [move] = planMoveQuants({ quants: [quant({ packageId: 'box' })], destinationId: 'shelf-2', reason: null, newId: sequentialIds() });

    expect(move).toMatchObject({ packageId: 'box', resultPackageId: 'box', locationDestId: 'shelf-2' });
  });

  it('takes a packed row out of its package where it is when unpacking', () => {
    const [move] = planMoveQuants({ quants: [quant({ packageId: 'box' })], destinationId: null, reason: null, newId: sequentialIds(), unpack: true });

    expect(move).toMatchObject({ packageId: 'box', locationId: 'stock', locationDestId: 'stock' });
    expect(move.resultPackageId).toBeUndefined();
  });
});

describe('planRelocateMoves with packages', () => {
  it('keeps a wholly selected package and takes the selected rows out of a package that keeps other stock', () => {
    const plan = planRelocateMoves({
      quants: [quant({ id: 'qa', productId: 'A', packageId: 'package02' }), quant({ id: 'qb', productId: 'B', packageId: 'package01' })],
      destinationId: 'shelf-1',
      reason: null,
      newId: sequentialIds(),
      packageContentIds: new Map([
        ['package02', ['qa']],
        ['package01', ['qb', 'qc']],
      ]),
    });
    const moves = plan.kind === 'moves' ? plan.moves : [];

    expect(moves.map((move) => [move.quantId, move.packageId, move.resultPackageId ?? null, move.locationDestId])).toEqual([
      ['qb', 'package01', null, 'shelf-1'],
      ['qa', 'package02', 'package02', 'shelf-1'],
    ]);
  });
});
