import { describe, expect, it, vi } from 'vitest';

import { memoryJournal } from 'src/stock/__tests__/fakes/fake-stock-db';
import { DRY_RUN_PROCUREMENT_WRITE_API } from 'src/stock/procurement/procurement-write-api';
import { runProcurementBatch } from 'src/stock/procurement/run-procurements';
import {
  ProcurementFailure,
  runPlannedProcurements,
  storeProcurementPlan,
} from 'src/stock/procurement/apply-procurement-plan';
import { type ProcurementWriteApi } from 'src/stock/procurement/types/procurement-write-api.type';
import { type ProcurementWritePlan } from 'src/stock/utils/procurement/types/procurement-write-plan.type';

type Table = Map<string, Record<string, unknown>>;

// Rows in memory behind the write API. Each call is one write, and the run can
// be stopped right after any of them.
const fakeApi = () => {
  const tables = {
    moves: new Map() as Table,
    moveLinks: new Map() as Table,
    routeLinks: new Map() as Table,
    referenceLinks: new Map() as Table,
  };
  const calls: string[] = [];
  const counter = { writes: 0, stopAfter: null as number | null };
  const wrote = (name: string) => {
    calls.push(name);
    counter.writes += 1;
    if (counter.writes === counter.stopAfter) {
      throw new Error('stopped');
    }
  };
  const createMissing =
    (table: Table, name: string) =>
    async (rows: { id: string; data: Record<string, unknown> }[]) => {
      for (const row of rows) {
        if (!table.has(row.id)) {
          table.set(row.id, structuredClone(row.data));
        }
      }
      wrote(name);
    };
  const api: ProcurementWriteApi = {
    createMoves: createMissing(tables.moves, 'createMoves'),
    linkMoves: createMissing(tables.moveLinks, 'linkMoves'),
    linkRoutes: createMissing(tables.routeLinks, 'linkRoutes'),
    linkReferences: createMissing(tables.referenceLinks, 'linkReferences'),
    setPartner: async (moveId, companyId) => {
      tables.moves.set(moveId, { ...tables.moves.get(moveId), companyId, personId: null });
      wrote('setPartner');
    },
    confirm: async (moveIds) => {
      for (const id of moveIds) {
        tables.moves.set(id, { ...tables.moves.get(id), state: 'CONFIRMED' });
      }
      wrote('confirm');
    },
  };
  const snapshot = () =>
    Object.fromEntries(Object.entries(tables).map(([name, table]) => [name, Object.fromEntries(table)]));

  return { api, calls, counter, snapshot };
};

// A delivery fed by a new move, itself fed by a second new move.
const writePlan = (suffix = ''): ProcurementWritePlan => ({
  runId: 'run-1',
  moves: [
    { id: `m-1${suffix}`, data: { productUomQty: 5, locationId: 'stock', locationDestId: 'output', procurementRun: 'run-1' } },
    { id: `m-2${suffix}`, data: { productUomQty: 5, locationId: 'vendors', locationDestId: 'stock', procurementRun: 'run-1' } },
  ],
  moveLinks: [
    { id: `l-1${suffix}`, data: { moveOrigId: `m-1${suffix}`, moveDestId: 'delivery' } },
    { id: `l-2${suffix}`, data: { moveOrigId: `m-2${suffix}`, moveDestId: `m-1${suffix}` } },
  ],
  routeLinks: [{ id: `r-1${suffix}`, data: { stockMoveId: `m-1${suffix}`, stockRouteId: 'mto' } }],
  referenceLinks: [{ id: `x-1${suffix}`, data: { moveId: `m-1${suffix}`, referenceId: 'ref-1' } }],
  partnerUpdates: [{ moveId: 'delivery', companyId: 'supplier' }],
});

const errors = [
  { message: 'No source location defined on stock rule: {rule}!', values: { rule: 'A' } },
  { message: 'No source location defined on stock rule: {rule}!', values: { rule: 'B' } },
];

describe('runPlannedProcurements', () => {
  it('refuses with every error joined, before its commit point, writing and storing nothing', async () => {
    const { api, calls } = fakeApi();
    const journal = memoryJournal();
    const onCommit = vi.fn(async () => {});

    await expect(
      runPlannedProcurements({
        plan: async () => {
          throw new ProcurementFailure(errors);
        },
        runId: 'run-1',
        api,
        journal,
        stepPrefix: 'procurement',
        onCommit,
      }),
    ).rejects.toThrow('No source location defined on stock rule: A!\nNo source location defined on stock rule: B!');
    expect(calls).toEqual([]);
    expect(journal.progress.size).toBe(0);
    expect(onCommit).not.toHaveBeenCalled();
  });

  it('plans before its commit point, then creates the moves, links them and confirms them', async () => {
    const { api, calls } = fakeApi();

    const ids = await runPlannedProcurements({
      plan: async () => writePlan(),
      runId: 'run-1',
      api,
      stepPrefix: 'procurement',
      onCommit: async () => {
        calls.push('commit');
      },
    });

    expect(ids).toEqual(['m-1', 'm-2']);
    expect(calls).toEqual(['commit', 'createMoves', 'linkMoves', 'linkRoutes', 'linkReferences', 'setPartner', 'confirm']);
  });

  it('ends after a stop at any write as a clean run does, without planning again', async () => {
    const clean = fakeApi();
    await runPlannedProcurements({ plan: async () => writePlan(), runId: 'run-1', api: clean.api, journal: memoryJournal(), stepPrefix: 'procurement' });
    const expected = clean.snapshot();

    for (let stopAfter = 1; stopAfter <= clean.counter.writes; stopAfter += 1) {
      const run = fakeApi();
      const progress = memoryJournal().progress;
      let planned = 0;
      const plan = async () => {
        planned += 1;
        return writePlan(planned === 1 ? '' : '-again');
      };
      run.counter.stopAfter = stopAfter;

      await expect(
        runPlannedProcurements({ plan, runId: 'run-1', api: run.api, journal: memoryJournal(false, progress), stepPrefix: 'procurement' }),
      ).rejects.toThrow('stopped');
      run.counter.stopAfter = null;
      await runPlannedProcurements({ plan, runId: 'run-2', api: run.api, journal: memoryJournal(true, progress), stepPrefix: 'procurement' });

      expect({ stopAfter, planned, snapshot: run.snapshot() }).toEqual({ stopAfter, planned: 1, snapshot: expected });
    }
  });

  it('writes the plan its check stored, even when planning again would now give another', async () => {
    const { api, snapshot } = fakeApi();
    const journal = memoryJournal();
    const replanned = vi.fn(async () => writePlan('-again'));

    await storeProcurementPlan(async () => writePlan(), { runId: 'run-1', journal, stepPrefix: 'procurement' });
    await runPlannedProcurements({ plan: replanned, runId: 'run-1', api, journal, stepPrefix: 'procurement' });

    expect(replanned).not.toHaveBeenCalled();
    expect(Object.keys(snapshot().moves).sort()).toEqual(['delivery', 'm-1', 'm-2']);
  });

  it('replays a plan with nothing to do after a stop, even when stock or rules changed meanwhile', async () => {
    const { api, snapshot } = fakeApi();
    const progress = memoryJournal().progress;
    const replanned = vi.fn(async () => writePlan());

    await expect(
      runPlannedProcurements({
        plan: async (runId) => ({ runId, moves: [], moveLinks: [], routeLinks: [], referenceLinks: [], partnerUpdates: [] }),
        runId: 'run-1',
        api,
        journal: memoryJournal(false, progress),
        stepPrefix: 'procurement',
        onCommit: async () => {
          throw new Error('stopped');
        },
      }),
    ).rejects.toThrow('stopped');
    await runPlannedProcurements({ plan: replanned, runId: 'run-2', api, journal: memoryJournal(true, progress), stepPrefix: 'procurement' });

    expect(replanned).not.toHaveBeenCalled();
    expect(snapshot().moves).toEqual({});
  });

  it('refuses to run the writing-nothing API under a journal, which would mark the real run done', async () => {
    await expect(runProcurementBatch([], { journal: memoryJournal(), api: DRY_RUN_PROCUREMENT_WRITE_API })).rejects.toThrow(
      'checkProcurementBatch',
    );
  });
});
