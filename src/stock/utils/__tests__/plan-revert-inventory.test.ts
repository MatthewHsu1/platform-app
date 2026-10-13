import { describe, expect, it } from 'vitest';

import { planRevertInventory } from 'src/stock/utils/plan-revert-inventory.util';
import { type InventoryLine } from 'src/stock/utils/types/inventory-line.type';

const sequentialIds = () => {
  let next = 0;
  return () => {
    next += 1;
    return `id-${next}`;
  };
};

const line = (overrides: Partial<InventoryLine>): InventoryLine => ({
  id: 'line',
  isInventory: true,
  reference: 'Physical Inventory',
  productId: 'product',
  productUomId: 'units',
  quantity: 0.4,
  quantityProductUom: 0.4,
  locationId: 'loss',
  locationDestId: 'stock',
  lotId: null,
  packageId: null,
  resultPackageId: null,
  ownerId: null,
  ...overrides,
});

describe('planRevertInventory', () => {
  it('mirrors an adjustment of 0.4 into stock back to the loss location', () => {
    expect(planRevertInventory({ lines: [line({})], digits: 2, newId: sequentialIds() })).toEqual({
      kind: 'moves',
      moves: [
        {
          quantId: null,
          moveId: 'id-1',
          lineId: 'id-2',
          productId: 'product',
          productUomId: 'units',
          quantity: 0.4,
          quantityProductUom: 0.4,
          locationId: 'stock',
          locationDestId: 'loss',
          ownerId: null,
          inventoryName: 'Physical Inventory [reverted]',
        },
      ],
    });
  });

  it('reverts two adjustments (100 in, then 50 in) with two mirror moves', () => {
    const plan = planRevertInventory({
      lines: [line({ id: 'first', quantity: 100, quantityProductUom: 100 }), line({ id: 'second', quantity: 50, quantityProductUom: 50 })],
      digits: 2,
      newId: sequentialIds(),
    });

    expect(plan.kind === 'moves' && plan.moves.map((move) => [move.quantity, move.locationDestId])).toEqual([
      [100, 'loss'],
      [50, 'loss'],
    ]);
  });

  it('names the mirror of an unnamed adjustment after the reference that an unnamed adjustment gets', () => {
    const plan = planRevertInventory({ lines: [line({ reference: null })], digits: 2, newId: sequentialIds() });

    expect(plan.kind === 'moves' && plan.moves[0].inventoryName).toBe('Product Quantity Updated [reverted]');
  });

  it('skips lines that are not adjustments or move nothing, and refuses when none is left', () => {
    expect(
      planRevertInventory({
        lines: [line({ isInventory: false }), line({ quantity: 0, quantityProductUom: 0 })],
        digits: 2,
        newId: sequentialIds(),
      }),
    ).toEqual({ kind: 'refuse', message: 'There are no inventory adjustments to revert.' });
  });
});

describe('planRevertInventory with a lot', () => {
  it('reverts a lot line on the same lot', () => {
    const plan = planRevertInventory({ lines: [line({ lotId: 'lot1' })], digits: 2, newId: sequentialIds() });

    expect(plan.kind === 'moves' ? plan.moves[0] : null).toMatchObject({ lotId: 'lot1', locationId: 'stock', locationDestId: 'loss' });
  });
});

describe('planRevertInventory with packages', () => {
  it('takes the stock back out of the package the adjustment put it in, and back into the one it came from', () => {
    const plan = planRevertInventory({ lines: [line({ packageId: 'from-box', resultPackageId: 'to-box' })], digits: 2, newId: sequentialIds() });

    expect(plan.kind === 'moves' ? plan.moves[0] : null).toMatchObject({ packageId: 'to-box', resultPackageId: 'from-box' });
  });
});
