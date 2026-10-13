import { describe, expect, it } from 'vitest';

import { makeClaims } from 'src/shared/claims/claim';
import { makeFakeClaimStore } from 'src/shared/claims/__tests__/fakes/fake-claim-store';
import { makeUnpackPackage } from 'src/stock/package/unpack-package';
import { NEGATIVE_PACKAGE_UNPACK, NOTHING_TO_UNPACK, PACKAGE_UNPACKED_REASON } from 'src/stock/utils/plan-package-rules.util';
import { type MoveQuantsOptions } from 'src/stock/quant/types/move-quants-options.type';
import { type QuantRow } from 'src/stock/types/quant-row.type';

class Stopped extends Error {}

const quantRow = (id: string, packageId: string | null, quantity: number): QuantRow => ({
  id,
  name: null,
  productId: 'p',
  locationId: 'stock',
  ownerId: null,
  lotId: null,
  packageId,
  quantity,
  reservedQuantity: 0,
  availableQuantity: quantity,
  inDate: null,
  quantKey: `p|stock||${packageId ?? ''}|${id}`,
  version: 1,
  inventoryQuantity: null,
  inventoryDiffQuantity: null,
  inventoryDate: null,
  inventoryQuantitySet: false,
  isOutdated: false,
  lastCountDate: null,
  assignedUserId: null,
});

// Packages and stock rows in memory. Moving a row out of its package is one write, applied once per move id; a stop
// can follow any write.
const setup = (parents: Record<string, string | null>, quants: QuantRow[]) => {
  const claimStore = makeFakeClaimStore();
  const claims = makeClaims(claimStore.store);
  const db = {
    parents: new Map(Object.entries(parents)),
    quants: new Map(quants.map((quant) => [quant.id, { ...quant }])),
    moves: [] as { quantId: string; to: string; reason: string | null; unpack: boolean }[],
    cleaned: [] as string[][],
    recomputed: [] as string[][],
    applied: new Set<string>(),
    writes: 0,
    stopAfter: null as number | null,
  };
  const wrote = () => {
    db.writes += 1;
    if (db.stopAfter === db.writes) {
      db.stopAfter = null;
      throw new Stopped();
    }
  };

  const unpack = makeUnpackPackage({
    withClaim: claims.withClaim,
    openJournal: claims.openJournal,
    readChildIds: async (packageId) => [...db.parents.entries()].filter(([, parent]) => parent === packageId).map(([id]) => id),
    readContent: async (packageId) =>
      [...db.quants.values()]
        .filter((quant) => quant.packageId === packageId)
        .map((quant) => ({ id: quant.id, quantity: quant.quantity, reservedQuantity: quant.reservedQuantity, quantKey: quant.quantKey })),
    releaseChildren: async (childIds) => {
      childIds.forEach((id) => db.parents.set(id, null));
      wrote();
    },
    readQuants: async (ids) => ids.flatMap((id) => (db.quants.has(id) ? [{ ...(db.quants.get(id) as QuantRow) }] : [])),
    moveQuants: async (rows: QuantRow[], destinationId: string | null, reason: string | null, options: MoveQuantsOptions) => {
      const plan = await options.journal.step(
        `${options.stepPrefix}:plan`,
        async () => rows.map((row) => ({ moveId: `move-${options.journal.runId}-${row.id}`, quantId: row.id, to: destinationId ?? row.locationId })),
        async () => {},
      );

      for (const move of plan) {
        await options.journal.step(`${options.stepPrefix}:${move.moveId}`, async () => true, async () => {
          if (db.applied.has(move.moveId)) {
            return;
          }
          db.applied.add(move.moveId);
          const quant = db.quants.get(move.quantId) as QuantRow;
          quant.packageId = options.unpack === true ? null : quant.packageId;
          db.moves.push({ quantId: move.quantId, to: move.to, reason, unpack: options.unpack === true });
          wrote();
        });
      }
    },
    deleteZeroQuants: async (keys) => {
      db.cleaned.push(keys);
    },
    recomputePackage: async (packageIds) => {
      db.recomputed.push(packageIds);
    },
  });

  return { claimStore, db, unpack };
};

describe('unpackPackage', () => {
  it('frees the contained packages and takes the stock out of the package where it is', async () => {
    const { claimStore, db, unpack } = setup({ pallet: null, box: 'pallet' }, [quantRow('q1', 'pallet', 3), quantRow('q0', 'pallet', 0)]);

    expect(await unpack.unpackPackage('pallet', PACKAGE_UNPACKED_REASON)).toEqual({ kind: 'done' });

    expect({
      box: db.parents.get('box'),
      moves: db.moves,
      cleaned: db.cleaned,
      recomputed: db.recomputed,
      claims: claimStore.rows.size,
    }).toEqual({
      box: null,
      moves: [{ quantId: 'q1', to: 'stock', reason: PACKAGE_UNPACKED_REASON, unpack: true }],
      cleaned: [['p|stock||pallet|q1', 'p|stock||pallet|q0']],
      recomputed: [['pallet', 'box']],
      claims: 0,
    });
  });

  it('refuses a package with nothing in it and writes nothing', async () => {
    const { claimStore, db, unpack } = setup({ pallet: null }, []);

    expect(await unpack.unpackPackage('pallet', PACKAGE_UNPACKED_REASON)).toEqual({ kind: 'refused', reason: NOTHING_TO_UNPACK });
    expect({ writes: db.writes, claims: claimStore.rows.size }).toEqual({ writes: 0, claims: 0 });
  });

  it('unpacks none of the selected packages when one of them is refused', async () => {
    const { db, unpack } = setup({ pallet: null, box: 'pallet', empty: null }, [quantRow('q1', 'pallet', 3)]);

    expect(await unpack.unpackPackages(['pallet', 'empty'], PACKAGE_UNPACKED_REASON)).toEqual({ kind: 'refused', reason: NOTHING_TO_UNPACK });
    expect({ box: db.parents.get('box'), writes: db.writes }).toEqual({ box: 'pallet', writes: 0 });
  });

  it('unpacks a package listed twice once, not refusing the second time it finds it empty', async () => {
    const { db, unpack } = setup({ pallet: null, box: 'pallet' }, [quantRow('q1', 'pallet', 3)]);

    expect(await unpack.unpackPackages(['pallet', 'pallet'], PACKAGE_UNPACKED_REASON)).toEqual({ kind: 'done' });
    expect(db.moves).toHaveLength(1);
  });

  it('refuses a package that holds a negative quantity before anything is written', async () => {
    const { db, unpack } = setup({ pallet: null }, [quantRow('q1', 'pallet', 3), quantRow('neg', 'pallet', -1)]);

    expect(await unpack.unpackPackages(['pallet'], PACKAGE_UNPACKED_REASON)).toEqual({ kind: 'refused', reason: NEGATIVE_PACKAGE_UNPACK });
    expect(db.writes).toBe(0);
  });

  it('the daily resume finishes an unpack stopped after the contained packages were freed', async () => {
    const { claimStore, db, unpack } = setup({ pallet: null, box: 'pallet' }, [quantRow('q1', 'pallet', 3), quantRow('q2', 'pallet', 2)]);
    db.stopAfter = 1;

    await expect(unpack.unpackPackage('pallet', PACKAGE_UNPACKED_REASON)).rejects.toThrow(Stopped);
    claimStore.advanceMinutes(16);
    await unpack.resumeUnpack('pallet');

    expect({
      box: db.parents.get('box'),
      moved: db.moves.map((move) => move.quantId),
      packed: [...db.quants.values()].map((quant) => quant.packageId),
      claims: claimStore.rows.size,
    }).toEqual({ box: null, moved: ['q1', 'q2'], packed: [null, null], claims: 0 });
  });
});
