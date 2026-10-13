import { makeClaims } from 'src/shared/claims/claim';
import { makeFakeClaimStore } from 'src/shared/claims/__tests__/fakes/fake-claim-store';
import { makePlanLotRelocations } from 'src/stock/lot/plan-lot-relocations';
import { makeRelocateLot } from 'src/stock/lot/relocate-lot';
import { makeRelocateLotBatch } from 'src/stock/lot/relocate-lot-batch';
import { LOCATION_USAGE } from 'src/stock/stock-options.constant';
import { planLotSummary } from 'src/stock/utils/plan-lot-location.util';
import { type ClaimStore } from 'src/shared/claims/types/claim-store.type';
import { type RecomputeLotOptions } from 'src/stock/lot/types/recompute-lot-options.type';
import { type MoveQuantsOptions } from 'src/stock/quant/types/move-quants-options.type';
import { type LocationUsage } from 'src/stock/types/location-usage.type';
import { type QuantRow } from 'src/stock/types/quant-row.type';

export class Stopped extends Error {}

export const quantRow = (id: string, locationId: string, quantity: number, ownerId: string | null = null, lotId = 'lot'): QuantRow => ({
  id,
  name: null,
  productId: 'p',
  locationId,
  ownerId,
  lotId,
  packageId: null,
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

// Stock rows of lots in memory. Moving a row is one write and is applied once per move id, as the real adjustment
// moves are made under ids their stored plan chose; a stop can follow any write. A lot's location is what a user
// typed until a recompute gives it the place its stock is in.
export const makeFakeLotStock = (quants: QuantRow[], lotLocations: Record<string, string | null>) => {
  const claimStore = makeFakeClaimStore();
  // `killAt`: the server stops as a batch run saves its plan, or its commit point, and nothing it tries after that
  // reaches the database, not even its clean-up.
  const faults = { killAt: null as 'plan' | 'commit' | null, dead: false };
  const alive = <TArgs extends unknown[], TResult>(call: (...args: TArgs) => Promise<TResult>) =>
    async (...args: TArgs) => {
      if (faults.dead) {
        throw new Stopped();
      }
      return call(...args);
    };
  const faultyStore: ClaimStore = {
    ...claimStore.store,
    create: alive(claimStore.store.create),
    createMany: alive(claimStore.store.createMany),
    destroy: alive(claimStore.store.destroy),
    destroyMany: alive(claimStore.store.destroyMany),
    updateWhere: alive(async (match, data) => {
      const savesPlan = data.progress?.steps['relocateLotBatch:plan'] !== undefined && data.progress.committed !== true;

      if ((faults.killAt === 'commit' && data.progress?.committed === true) || (faults.killAt === 'plan' && savesPlan)) {
        faults.killAt = null;
        faults.dead = true;
        throw new Stopped();
      }
      return claimStore.store.updateWhere(match, data);
    }),
  };
  const claims = makeClaims(faultyStore);
  const db = {
    quants: new Map(quants.map((quant) => [quant.id, { ...quant }])),
    lots: new Map(Object.entries(lotLocations).map(([id, locationId]) => [id, { locationId, productQty: 0 as number | null }])),
    usages: new Map<string, LocationUsage>([
      ['A', LOCATION_USAGE.INTERNAL],
      ['B', LOCATION_USAGE.INTERNAL],
      ['C', LOCATION_USAGE.INTERNAL],
      ['shelf', LOCATION_USAGE.INTERNAL],
      ['WH', LOCATION_USAGE.VIEW],
    ]),
    moveCalls: [] as { quantIds: string[]; to: string | null; unpack: boolean }[],
    moves: [] as { quantId: string; to: string; reason: string | null }[],
    unpacked: [] as boolean[],
    packageQuantCounts: new Map<string, number>(),
    applied: new Set<string>(),
    writes: 0,
    stopAfter: null as number | null,
  };

  const moveQuants = async (rows: QuantRow[], destinationId: string | null, reason: string | null, options: MoveQuantsOptions) => {
    db.unpacked.push(options.unpack === true);
    db.moveCalls.push({ quantIds: rows.map((row) => row.id), to: destinationId, unpack: options.unpack === true });
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
        db.moves.push({ quantId: move.quantId, to: move.to, reason });
        db.writes += 1;
        if (db.stopAfter === db.writes) {
          db.stopAfter = null;
          throw new Stopped();
        }
      });
    }
  };

  const recomputeLot = async (lotIds: string[], options: RecomputeLotOptions = {}) => {
    for (const lotId of new Set(lotIds)) {
      const quants = [...db.quants.values()].filter((quant) => quant.lotId === lotId);

      if (options.keepWhenEmpty === true && !quants.some((quant) => quant.quantity > 0)) {
        continue;
      }
      const summary = planLotSummary({ quants, scopeLocationIds: new Set(['A', 'B', 'C', 'shelf']) });
      db.lots.set(lotId, { locationId: summary.locationId, productQty: summary.productQty });
    }
  };

  const planLotRelocations = makePlanLotRelocations({
    readLotQuants: async (lotIds) =>
      [...db.quants.values()]
        .filter((quant) => quant.lotId !== null && lotIds.includes(quant.lotId) && quant.quantity > 0)
        .map((quant) => ({
          id: quant.id,
          lotId: quant.lotId as string,
          locationId: quant.locationId,
          quantity: quant.quantity,
          packageId: quant.packageId,
        })),
    readPackageQuantCounts: async (packageIds) =>
      new Map(packageIds.map((packageId) => [packageId, db.packageQuantCounts.get(packageId) ?? 0])),
    readLotLocations: async (lotIds) => new Map(lotIds.map((lotId) => [lotId, db.lots.get(lotId)?.locationId ?? null])),
    readLocations: async (ids) =>
      new Map(ids.flatMap((id) => (db.usages.has(id) ? [[id, { usage: db.usages.get(id) as LocationUsage, completeName: id }] as const] : []))),
  });

  const readQuants = async (ids: string[]) =>
    ids.flatMap((id) => (db.quants.has(id) ? [{ ...(db.quants.get(id) as QuantRow) }] : []));

  let batchCounter = 0;
  const batch = makeRelocateLotBatch({
    ...claims,
    newBatchId: () => {
      batchCounter += 1;
      return `batch-${batchCounter}`;
    },
    planLotRelocations,
    readQuants,
    moveQuants,
    recomputeLot,
  });

  const relocate = makeRelocateLot({
    withClaim: claims.withClaim,
    openJournal: claims.openJournal,
    planLotRelocations,
    readQuants,
    moveQuants,
    recomputeLot,
    resumeBatch: batch.resumeRelocateLotBatch,
  });

  const stockAt = () => [...db.quants.values()].map((quant) => `${quant.id}@${quant.locationId}`).sort();
  const lotAt = () => Object.fromEntries([...db.lots.entries()].map(([id, lot]) => [id, lot.locationId]));

  return { claimStore, faults, db, relocate, batch, stockAt, lotAt };
};
