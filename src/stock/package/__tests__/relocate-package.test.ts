import { describe, expect, it } from 'vitest';

import { makeClaims } from 'src/shared/claims/claim';
import { makeFakeClaimStore } from 'src/shared/claims/__tests__/fakes/fake-claim-store';
import { makeRelocatePackage } from 'src/stock/package/relocate-package';
import { LOCATION_USAGE } from 'src/stock/stock-options.constant';
import { VIEW_LOCATION_REASON } from 'src/stock/utils/plan-count-quant-create.util';
import {
  PACKAGE_EMPTY_CANNOT_MOVE,
  PACKAGE_NOT_EMPTY_NO_LOCATION,
  PACKAGE_RELOCATED_REASON,
} from 'src/stock/utils/plan-package-rules.util';
import { type ClaimProgress } from 'src/shared/claims/types/claim-progress.type';
import { type MoveQuantsOptions } from 'src/stock/quant/types/move-quants-options.type';
import { type LocationUsage } from 'src/stock/types/location-usage.type';
import { type QuantRow } from 'src/stock/types/quant-row.type';

const KEY = 'relocatePackage:pack1';

class Stopped extends Error {}

const quantRow = (id: string, packageId: string, locationId: string, quantity: number): QuantRow => ({
  id,
  name: null,
  productId: id === 'q1' ? 'productA' : 'productB',
  locationId,
  ownerId: null,
  lotId: null,
  packageId,
  quantity,
  reservedQuantity: 0,
  availableQuantity: quantity,
  inDate: null,
  quantKey: null,
  version: 1,
  inventoryQuantity: null,
  inventoryDiffQuantity: null,
  inventoryDate: null,
  inventoryQuantitySet: false,
  isOutdated: false,
  lastCountDate: null,
  assignedUserId: null,
});

// Stock rows of packages in memory; a package shows where its first row with stock is. Moving a row is one write,
// applied once per move id; a stop can follow any write.
const setup = (quants: QuantRow[]) => {
  const claimStore = makeFakeClaimStore();
  const claims = makeClaims(claimStore.store);
  const db = {
    quants: new Map(quants.map((quant) => [quant.id, { ...quant }])),
    packageLocations: new Map<string, string | null>(),
    usages: new Map<string, LocationUsage>([
      ['stock', LOCATION_USAGE.INTERNAL],
      ['shelf1', LOCATION_USAGE.INTERNAL],
      ['WH', LOCATION_USAGE.VIEW],
    ]),
    moves: [] as { quantId: string; to: string; reason: string | null; keepUpTo: string[] }[],
    applied: new Set<string>(),
    writes: 0,
    stopAfter: null as number | null,
  };
  const recomputePackage = async (packageIds: string[]) => {
    for (const packageId of packageIds) {
      const first = [...db.quants.values()].find((quant) => quant.packageId === packageId && quant.quantity > 0);
      db.packageLocations.set(packageId, first?.locationId ?? null);
    }
  };

  const moveQuants = async (rows: QuantRow[], destinationId: string | null, reason: string | null, options: MoveQuantsOptions) => {
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
        (db.quants.get(move.quantId) as QuantRow).locationId = move.to;
        db.moves.push({ quantId: move.quantId, to: move.to, reason, keepUpTo: options.upToParentPackages ?? [] });
        db.writes += 1;
        if (db.stopAfter === db.writes) {
          db.stopAfter = null;
          throw new Stopped();
        }
      });
    }
  };

  const relocate = makeRelocatePackage({
    withClaim: claims.withClaim,
    openJournal: claims.openJournal,
    readContent: async (packageId) =>
      [...db.quants.values()]
        .filter((quant) => quant.packageId === packageId && (quant.quantity !== 0 || quant.reservedQuantity !== 0))
        .map((quant) => ({ id: quant.id, locationId: quant.locationId, quantity: quant.quantity, reservedQuantity: quant.reservedQuantity })),
    readLocation: async (id) => {
      const usage = db.usages.get(id);
      return usage === undefined ? null : { usage, completeName: id };
    },
    readQuants: async (ids) => ids.flatMap((id) => (db.quants.has(id) ? [{ ...(db.quants.get(id) as QuantRow) }] : [])),
    moveQuants,
    recomputePackage,
  });

  const stockAt = () => [...db.quants.values()].map((quant) => `${quant.id}@${quant.locationId}`).sort();

  return { claimStore, db, relocate, stockAt };
};

describe('relocatePackage', () => {
  it('moves the stock of each package to the typed location, and each package shows it', async () => {
    const { claimStore, db, relocate, stockAt } = setup([quantRow('q1', 'pack1', 'stock', 10), quantRow('q2', 'pack2', 'stock', 10)]);

    expect(await relocate.relocatePackage('pack1', 'shelf1')).toEqual({ kind: 'done' });
    expect(await relocate.relocatePackage('pack2', 'shelf1')).toEqual({ kind: 'done' });

    expect({
      stock: stockAt(),
      locations: [db.packageLocations.get('pack1'), db.packageLocations.get('pack2')],
      moves: db.moves,
      claims: claimStore.rows.size,
    }).toEqual({
      stock: ['q1@shelf1', 'q2@shelf1'],
      locations: ['shelf1', 'shelf1'],
      moves: [
        { quantId: 'q1', to: 'shelf1', reason: PACKAGE_RELOCATED_REASON, keepUpTo: ['pack1'] },
        { quantId: 'q2', to: 'shelf1', reason: PACKAGE_RELOCATED_REASON, keepUpTo: ['pack2'] },
      ],
      claims: 0,
    });
  });

  it('refuses to clear the location of a package that holds stock, and to move a package that holds none', async () => {
    const { db, relocate } = setup([quantRow('q1', 'pack1', 'stock', 10)]);

    expect(await relocate.relocatePackage('pack1', null)).toEqual({ kind: 'refused', reason: PACKAGE_NOT_EMPTY_NO_LOCATION, values: {} });
    expect(await relocate.relocatePackage('empty', 'shelf1')).toEqual({ kind: 'refused', reason: PACKAGE_EMPTY_CANNOT_MOVE, values: {} });
    expect(db.moves).toEqual([]);
  });

  it('refuses a virtual location before anything moves', async () => {
    const { db, relocate } = setup([quantRow('q1', 'pack1', 'stock', 10)]);

    expect(await relocate.relocatePackage('pack1', 'WH')).toEqual({
      kind: 'refused',
      reason: VIEW_LOCATION_REASON,
      values: { location: 'WH' },
    });
    expect(db.moves).toEqual([]);
  });

  it('a second delivery of the same edit moves nothing', async () => {
    const { db, relocate } = setup([quantRow('q1', 'pack1', 'stock', 10)]);

    await relocate.relocatePackage('pack1', 'shelf1');
    await relocate.relocatePackage('pack1', 'shelf1');

    expect(db.moves.map((move) => move.to)).toEqual(['shelf1']);
  });
});

describe('relocatePackage after a stopped run', () => {
  const storedRun = (progress: ClaimProgress) => ({
    id: 'stopped',
    key: KEY,
    runId: 'stopped-run',
    startedAt: '2026-10-08T09:00:00.000Z',
    finishedAt: null,
    progress,
  });

  it('the daily resume finishes a move stopped half way: each row moved once, as a clean run leaves it', async () => {
    const rows = () => [quantRow('q1', 'pack1', 'stock', 4), quantRow('q2', 'pack1', 'stock', 6)];
    const clean = setup(rows());
    await clean.relocate.relocatePackage('pack1', 'shelf1');

    const stopped = setup(rows());
    stopped.db.stopAfter = 1;
    await expect(stopped.relocate.relocatePackage('pack1', 'shelf1')).rejects.toThrow(Stopped);
    stopped.claimStore.advanceMinutes(16);
    await stopped.relocate.resumeRelocatePackage('pack1');

    expect({
      stock: stopped.stockAt(),
      location: stopped.db.packageLocations.get('pack1'),
      moves: stopped.db.moves.length,
      claims: stopped.claimStore.rows.size,
    }).toEqual({ stock: clean.stockAt(), location: 'shelf1', moves: 2, claims: 0 });
  });

  it('the daily resume frees a run that stopped before its commit point: nothing moves and the package shows where its stock is', async () => {
    const { claimStore, db, relocate, stockAt } = setup([quantRow('q1', 'pack1', 'stock', 1)]);
    claimStore.rows.set(
      KEY,
      storedRun({
        steps: {
          'relocatePackage:plan': {
            plan: { kind: 'move', quantIds: ['q1'], upToParentPackageIds: ['pack1'], toLocationId: 'shelf1' },
            done: true,
          },
        },
      }),
    );

    await relocate.resumeRelocatePackage('pack1');

    expect({ stock: stockAt(), location: db.packageLocations.get('pack1'), moves: db.moves, claims: claimStore.rows.size }).toEqual({
      stock: ['q1@stock'],
      location: 'stock',
      moves: [],
      claims: 0,
    });
  });
});
