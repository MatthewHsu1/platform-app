import { describe, expect, it } from 'vitest';

import { makeRecomputePackage } from 'src/stock/package/recompute-package';

type Pack = { id: string; name: string; parentPackageId: string | null; locationId: string | null };
type Quant = { id: string; packageId: string; locationId: string; quantity: number; createdAt: string };

const setup = (packages: Pack[], quants: Quant[]) => {
  const db = { packages: new Map(packages.map((pack) => [pack.id, { ...pack }])), quants, writes: [] as [string, string | null][] };
  const recompute = makeRecomputePackage({
    readPackages: async (ids) => ids.flatMap((id) => (db.packages.has(id) ? [{ ...(db.packages.get(id) as Pack) }] : [])),
    readChildren: async (parentIds) => [...db.packages.values()].filter((pack) => pack.parentPackageId !== null && parentIds.includes(pack.parentPackageId)),
    readPositiveQuants: async (packageIds) => db.quants.filter((quant) => packageIds.includes(quant.packageId) && quant.quantity > 0),
    writeLocation: async (packageId, locationId) => {
      db.writes.push([packageId, locationId]);
      (db.packages.get(packageId) as Pack).locationId = locationId;
    },
  });

  return { db, recompute };
};

describe('recomputePackage', () => {
  it('places a package where its stock is, then its new container there too', async () => {
    const { db, recompute } = setup(
      [
        { id: 'pack1', name: 'Pack1', parentPackageId: null, locationId: null },
        { id: 'pack2', name: 'Pack2', parentPackageId: null, locationId: null },
      ],
      [{ id: 'q1', packageId: 'pack1', locationId: 'stock', quantity: 1, createdAt: '2026-10-01T00:00:00.000Z' }],
    );

    await recompute(['pack1', 'pack2']);
    expect([db.packages.get('pack1')?.locationId, db.packages.get('pack2')?.locationId]).toEqual(['stock', null]);

    (db.packages.get('pack1') as Pack).parentPackageId = 'pack2';
    await recompute(['pack1']);
    expect(db.packages.get('pack2')?.locationId).toBe('stock');
  });

  it('writes nothing when every package already shows its place', async () => {
    const { db, recompute } = setup(
      [{ id: 'pack1', name: 'Pack1', parentPackageId: null, locationId: 'stock' }],
      [{ id: 'q1', packageId: 'pack1', locationId: 'stock', quantity: 1, createdAt: '2026-10-01T00:00:00.000Z' }],
    );

    await recompute(['pack1']);

    expect(db.writes).toEqual([]);
  });

  it('clears the place of a package left with nothing', async () => {
    const { db, recompute } = setup([{ id: 'pack1', name: 'Pack1', parentPackageId: null, locationId: 'stock' }], []);

    await recompute(['pack1']);

    expect(db.writes).toEqual([['pack1', null]]);
  });
});
