import { describe, expect, it } from 'vitest';

import { inventoryDifference, planInventoryMoves } from 'src/stock/utils/plan-inventory-moves.util';
import { type InventoryQuant } from 'src/stock/utils/types/inventory-quant.type';

const sequentialIds = () => {
  let next = 0;
  return () => {
    next += 1;
    return `id-${next}`;
  };
};

const quant = (overrides: Partial<InventoryQuant>): InventoryQuant => ({
  id: 'quant',
  productId: 'product',
  productUomId: 'units',
  locationId: 'stock',
  lotId: null,
  packageId: null,
  ownerId: null,
  quantity: 0,
  inventoryQuantity: null,
  inventoryDiffQuantity: null,
  inventoryQuantitySet: false,
  propertyStockInventoryId: null,
  ...overrides,
});

describe('inventoryDifference', () => {
  it('counts an untouched row as 0 when it is applied', () => {
    expect(inventoryDifference(quant({ quantity: 100, inventoryQuantity: 0 }), 2)).toBe(-100);
  });

  it('keeps the difference stored with a typed count', () => {
    expect(
      inventoryDifference(
        quant({ quantity: 4, inventoryQuantity: 5, inventoryDiffQuantity: -2, inventoryQuantitySet: true }),
        2,
      ),
    ).toBe(-2);
  });
});

describe('planInventoryMoves', () => {
  it('removes every unit of an untouched row of 100 into the seed loss location', () => {
    expect(
      planInventoryMoves({
        quants: [quant({ quantity: 100, inventoryQuantity: 0 })],
        seedInventoryLocationId: 'loss',
        inventoryName: null,
        digits: 2,
        newId: sequentialIds(),
      }),
    ).toEqual([
      {
        quantId: 'quant',
        moveId: 'id-1',
        lineId: 'id-2',
        productId: 'product',
        productUomId: 'units',
        quantity: 100,
        quantityProductUom: 100,
        locationId: 'stock',
        locationDestId: 'loss',
        ownerId: null,
        inventoryName: null,
      },
    ]);
  });

  it('brings a count of 24 on a new row in from the loss location', () => {
    const [move] = planInventoryMoves({
      quants: [quant({ quantity: 0, inventoryQuantity: 24, inventoryDiffQuantity: 24, inventoryQuantitySet: true })],
      seedInventoryLocationId: 'loss',
      inventoryName: 'Physical Inventory',
      digits: 2,
      newId: sequentialIds(),
    });

    expect(move).toMatchObject({ quantity: 24, locationId: 'loss', locationDestId: 'stock', inventoryName: 'Physical Inventory' });
  });

  it("uses the product's own inventory location before the seed one", () => {
    const [move] = planInventoryMoves({
      quants: [
        quant({
          quantity: 3,
          inventoryQuantity: 1,
          inventoryDiffQuantity: -2,
          inventoryQuantitySet: true,
          propertyStockInventoryId: 'own-loss',
        }),
      ],
      seedInventoryLocationId: 'loss',
      inventoryName: null,
      digits: 2,
      newId: sequentialIds(),
    });

    expect(move).toMatchObject({ quantity: 2, locationId: 'stock', locationDestId: 'own-loss' });
  });

  it('still makes a move of 0 when the count equals the stock, and keeps the owner', () => {
    const [move] = planInventoryMoves({
      quants: [quant({ quantity: 10, inventoryQuantity: 10, inventoryDiffQuantity: 0, inventoryQuantitySet: true, ownerId: 'acme' })],
      seedInventoryLocationId: 'loss',
      inventoryName: null,
      digits: 2,
      newId: sequentialIds(),
    });

    expect(move).toMatchObject({ quantity: 0, locationId: 'stock', locationDestId: 'loss', ownerId: 'acme' });
  });
});

describe('planInventoryMoves with a lot', () => {
  it('puts the adjustment line on the lot of the counted row', () => {
    const [move] = planInventoryMoves({
      quants: [quant({ lotId: 'lot1', quantity: 2, inventoryQuantity: 5, inventoryDiffQuantity: 3, inventoryQuantitySet: true })],
      seedInventoryLocationId: 'loss',
      inventoryName: null,
      digits: 2,
      newId: sequentialIds(),
    });

    expect(move).toMatchObject({ lotId: 'lot1', locationId: 'loss', locationDestId: 'stock', quantity: 3 });
  });
});

describe('planInventoryMoves with a package', () => {
  const count = (quantity: number, inventoryQuantity: number) =>
    planInventoryMoves({
      quants: [
        quant({ packageId: 'box', quantity, inventoryQuantity, inventoryDiffQuantity: inventoryQuantity - quantity, inventoryQuantitySet: true }),
      ],
      seedInventoryLocationId: 'loss',
      inventoryName: null,
      digits: 2,
      newId: sequentialIds(),
    })[0];

  it('brings what the count found into the package of the counted row', () => {
    expect(count(2, 5)).toMatchObject({ resultPackageId: 'box', locationId: 'loss', locationDestId: 'stock', quantity: 3 });
    expect(count(2, 5).packageId).toBeUndefined();
  });

  it('takes what the count missed out of the package of the counted row', () => {
    expect(count(5, 2)).toMatchObject({ packageId: 'box', locationId: 'stock', locationDestId: 'loss', quantity: 3 });
    expect(count(5, 2).resultPackageId).toBeUndefined();
  });
});
