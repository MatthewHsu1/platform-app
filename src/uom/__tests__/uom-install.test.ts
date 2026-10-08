import { describe, expect, it } from 'vitest';

import { UOM_INSTALL } from 'src/uom/uom-install';
import { resolveUoms } from 'src/uom/utils/uom.util';

describe('UOM_INSTALL seed rows', () => {
  const rows = UOM_INSTALL.seedRows[0].rows;

  it('has the 30 default units, 14 active', () => {
    expect(rows).toHaveLength(30);
    expect(rows.filter((row) => row.values.active !== false)).toHaveLength(14);
  });

  it('lists each parent before its children', () => {
    const seen = new Set<string>();
    for (const row of rows) {
      if (row.parentSeedKey !== undefined) {
        expect(seen.has(row.parentSeedKey)).toBe(true);
      }
      seen.add(row.seedKey);
    }
  });

  it('gives the default units their absolute factors', () => {
    const { resolved } = resolveUoms(
      rows.map((row) => ({
        id: row.seedKey,
        name: String(row.values.name),
        relativeUomId: row.parentSeedKey ?? null,
        relativeFactor: Number(row.values.relativeFactor),
        seedKey: row.seedKey,
      })),
    );
    expect(resolved.get('uom.product_uom_km')?.factor).toBe(1_000_000);
    expect(resolved.get('uom.product_uom_lb')?.factor).toBeCloseTo(453.592, 6);
    expect(resolved.get('uom.product_uom_gal')?.factor).toBeCloseTo(3785.408, 3);
    expect(resolved.get('uom.product_uom_cubic_foot')?.factor).toBeCloseTo(28316.9088, 2);
  });
});
