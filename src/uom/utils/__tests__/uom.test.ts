import { describe, expect, it } from 'vitest';

import {
  checkQty,
  computePrice,
  computeQuantity,
  isProtectedSeedUnit,
  keepsSeedUnitOnDelete,
  planRootFactorPutBack,
  planUomUpdate,
  resolveUoms,
  unitDeleteRefusal,
  unitsReachedByDelete,
} from 'src/uom/utils/uom.util';
import { type UomRow } from 'src/uom/utils/types/uom-row.type';

const row = (id: string, relativeFactor: number, relativeUomId: string | null = null): UomRow => ({
  id,
  name: id,
  relativeUomId,
  relativeFactor,
  seedKey: null,
});

// The default units
const { resolved } = resolveUoms([
  row('Units', 1),
  row('Pack6', 6, 'Units'),
  row('mm', 1),
  row('cm', 10, 'mm'),
  row('m', 100, 'cm'),
  row('g', 1),
  row('kg', 1000, 'g'),
  row('Ton', 1000, 'kg'),
  row('oz', 28.3495, 'g'),
  row('lb', 16, 'oz'),
]);
const unit = (id: string) => resolved.get(id)!;

describe('resolveUoms', () => {
  it('multiplies the chain into an absolute factor', () => {
    expect(unit('m').factor).toBe(1000);
    expect(unit('Ton').factor).toBe(1_000_000);
    expect(unit('lb').factor).toBeCloseTo(453.592, 10);
  });

  it('records the root and the path', () => {
    expect(unit('kg').rootId).toBe('g');
    expect(unit('kg').parentPath).toBe('g/kg/');
  });

  it('reports a loop', () => {
    expect(resolveUoms([row('a', 2, 'b'), row('b', 2, 'a')]).cycles.sort()).toEqual(['a', 'b']);
  });
});

describe('computeQuantity', () => {
  it('converts through the factors and rounds up at 2 decimals', () => {
    expect(computeQuantity({ qty: 150, from: unit('g'), to: unit('kg'), digits: 2 })).toBe(0.15);
    expect(computeQuantity({ qty: 1, from: unit('g'), to: unit('kg'), digits: 2 })).toBe(0.01);
    expect(computeQuantity({ qty: 2, from: unit('m'), to: unit('mm'), digits: 2 })).toBe(2000);
    expect(computeQuantity({ qty: 1, from: unit('Ton'), to: unit('kg'), digits: 2 })).toBe(1000);
  });

  it('keeps the raw value when rounding is off', () => {
    expect(computeQuantity({ qty: 1, from: unit('g'), to: unit('kg'), digits: 2, round: false })).toBe(0.001);
  });

  it('returns zero unchanged', () => {
    expect(computeQuantity({ qty: 0, from: unit('g'), to: unit('m'), digits: 2 })).toBe(0);
  });

  it('refuses units from different trees', () => {
    expect(() => computeQuantity({ qty: 1, from: unit('g'), to: unit('m'), digits: 2 })).toThrow(
      'Cannot convert g to m: they do not share a reference unit.',
    );
  });
});

describe('computePrice', () => {
  it('turns a price per one unit into a price per the other, unrounded', () => {
    expect(computePrice({ price: 5, from: unit('kg'), to: unit('g') })).toBe(0.005);
    expect(computePrice({ price: 8, from: unit('Units'), to: unit('Pack6') })).toBe(48);
  });
});

describe('checkQty', () => {
  it('rounds a quantity to whole packagings, half up', () => {
    expect(checkQty({ qty: 13, productUom: unit('Units'), packagingUom: unit('Pack6'), digits: 2 })).toBe(12);
    expect(checkQty({ qty: 15, productUom: unit('Units'), packagingUom: unit('Pack6'), digits: 2 })).toBe(18);
  });
});

describe('isProtectedSeedUnit', () => {
  it('protects default units except Hours, Dozens and Pack of 6', () => {
    expect(isProtectedSeedUnit('uom.product_uom_unit')).toBe(true);
    expect(isProtectedSeedUnit('uom.product_uom_hour')).toBe(false);
    expect(isProtectedSeedUnit('uom.product_uom_dozen')).toBe(false);
    expect(isProtectedSeedUnit('uom.product_uom_pack_6')).toBe(false);
    expect(isProtectedSeedUnit(null)).toBe(false);
  });
});

describe('planUomUpdate', () => {
  it('writes factor, path and a sequence from the factor when empty', () => {
    expect(
      planUomUpdate({ row: { id: 'Pack6', factor: null, parentPath: null, sequence: null, relativeFactor: 6 }, resolved: unit('Pack6') }),
    ).toEqual({ factor: 6, parentPath: 'Units/Pack6/', sequence: 600 });
  });

  it('caps the sequence at 1000', () => {
    expect(
      planUomUpdate({ row: { id: 'Ton', factor: null, parentPath: null, sequence: null, relativeFactor: 1000 }, resolved: unit('Ton') }).sequence,
    ).toBe(1000);
  });

  it('writes nothing when every value is already right', () => {
    expect(
      planUomUpdate({ row: { id: 'Pack6', factor: 6, parentPath: 'Units/Pack6/', sequence: 5, relativeFactor: 6 }, resolved: unit('Pack6') }),
    ).toEqual({});
  });

  it('writes nothing for a non-integer factor read back as stored', () => {
    const pound = unit('lb');
    expect(pound.factor).toBeCloseTo(453.592, 10);
    expect(
      planUomUpdate({
        row: { id: 'lb', factor: pound.factor, parentPath: pound.parentPath, sequence: 1600, relativeFactor: 16 },
        resolved: pound,
      }),
    ).toEqual({});
  });
});

describe('planRootFactorPutBack', () => {
  it('gives a unit that lost its reference unit both old values back', () => {
    expect(
      planRootFactorPutBack({
        before: { relativeUomId: 'Units', relativeFactor: 6 },
        after: { relativeUomId: null, relativeFactor: 6 },
      }),
    ).toEqual({ relativeUomId: 'Units', relativeFactor: 6 });
  });

  it('resets a root set to 5 back to 1', () => {
    expect(
      planRootFactorPutBack({
        before: { relativeUomId: null, relativeFactor: 1 },
        after: { relativeUomId: null, relativeFactor: 5 },
      }),
    ).toEqual({ relativeFactor: 1 });
  });

  it('resets a created root with factor 3 to 1', () => {
    expect(planRootFactorPutBack({ after: { relativeUomId: null, relativeFactor: 3 } })).toEqual({
      relativeFactor: 1,
    });
  });

  it('does nothing for a root with factor 1 or a unit with a parent', () => {
    expect(planRootFactorPutBack({ after: { relativeUomId: null, relativeFactor: 1 } })).toBeNull();
    expect(planRootFactorPutBack({ after: { relativeUomId: 'Units', relativeFactor: 6 } })).toBeNull();
  });
});

// Default units: Days and Minutes are based on Hours, Pack of 6
// and Dozens on Units.
describe('unit delete (relative_uom_id cascade, product unit restrict)', () => {
  const units = [
    { id: 'Units', relativeUomId: null },
    { id: 'Pack6', relativeUomId: 'Units' },
    { id: 'Dozens', relativeUomId: 'Units' },
    { id: 'Hours', relativeUomId: null },
    { id: 'Days', relativeUomId: 'Hours' },
    { id: 'Minutes', relativeUomId: 'Hours' },
  ];
  const REFUSAL =
    'Products or vendor prices use this unit, or a unit based on it. Archive it (untick Active) instead of deleting it.';

  it('reaches the unit and every unit based on it, and no other', () => {
    expect(unitsReachedByDelete({ unitId: 'Hours', units }).sort()).toEqual(['Days', 'Hours', 'Minutes']);
    expect(unitsReachedByDelete({ unitId: 'Pack6', units })).toEqual(['Pack6']);
  });

  it('follows the tree down more than one level', () => {
    expect(
      unitsReachedByDelete({
        unitId: 'mm',
        units: [
          { id: 'mm', relativeUomId: null },
          { id: 'cm', relativeUomId: 'mm' },
          { id: 'm', relativeUomId: 'cm' },
          { id: 'km', relativeUomId: 'm' },
        ],
      }).sort(),
    ).toEqual(['cm', 'km', 'm', 'mm']);
  });

  it('refuses the delete when a product or vendor price uses the unit itself', () => {
    expect(unitDeleteRefusal({ reachedUnitIds: ['Pack6'], usedUnitIds: ['Pack6'] })).toBe(REFUSAL);
  });

  it('refuses the delete when only a unit the cascade reaches is used', () => {
    expect(unitDeleteRefusal({ reachedUnitIds: ['Hours', 'Days', 'Minutes'], usedUnitIds: ['Days'] })).toBe(REFUSAL);
  });

  it('allows the delete when nothing it reaches is used', () => {
    expect(unitDeleteRefusal({ reachedUnitIds: ['Hours', 'Days', 'Minutes'], usedUnitIds: ['Units'] })).toBeNull();
  });
});

describe('keepsSeedUnitOnDelete (master data check, skipped by the cascade)', () => {
  const none = new Set<string>();

  it('keeps a protected unit deleted on its own, whoever deletes it', () => {
    expect(
      keepsSeedUnitOnDelete({ seedKey: 'uom.product_uom_kgm', relativeUomId: 'g', batchIds: new Set(['kg']), deletedUnitIds: new Set(['kg']) }),
    ).toBe(true);
    expect(
      keepsSeedUnitOnDelete({ seedKey: 'uom.product_uom_unit', relativeUomId: null, batchIds: none, deletedUnitIds: none }),
    ).toBe(true);
  });

  it('lets the cascade take Days when Hours is in the trash', () => {
    expect(
      keepsSeedUnitOnDelete({ seedKey: 'uom.product_uom_day', relativeUomId: 'Hours', batchIds: new Set(['Days', 'Minutes']), deletedUnitIds: new Set(['Hours', 'Days', 'Minutes']) }),
    ).toBe(false);
  });

  it('lets kg go when g is in the trash from an earlier delete', () => {
    expect(
      keepsSeedUnitOnDelete({ seedKey: 'uom.product_uom_kgm', relativeUomId: 'g', batchIds: new Set(['kg']), deletedUnitIds: new Set(['g', 'kg']) }),
    ).toBe(false);
  });

  it('keeps g and kg picked together in one delete', () => {
    const batchIds = new Set(['g', 'kg']);
    const deletedUnitIds = new Set(['g', 'kg']);

    expect(keepsSeedUnitOnDelete({ seedKey: 'uom.product_uom_gram', relativeUomId: null, batchIds, deletedUnitIds })).toBe(true);
    expect(keepsSeedUnitOnDelete({ seedKey: 'uom.product_uom_kgm', relativeUomId: 'g', batchIds, deletedUnitIds })).toBe(true);
  });

  it('never keeps an unprotected unit', () => {
    expect(
      keepsSeedUnitOnDelete({ seedKey: 'uom.product_uom_hour', relativeUomId: null, batchIds: none, deletedUnitIds: none }),
    ).toBe(false);
    expect(keepsSeedUnitOnDelete({ seedKey: null, relativeUomId: 'Units', batchIds: none, deletedUnitIds: none })).toBe(false);
  });
});
