import { describe, expect, it } from 'vitest';

import { makeClaims } from 'src/shared/claims/claim';
import { makeFakeClaimStore } from 'src/shared/claims/__tests__/fakes/fake-claim-store';
import { makeAddToWave } from 'src/stock-picking-batch/add-to-wave';
import { BATCH_MESSAGES } from 'src/stock-picking-batch/stock-picking-batch-messages.constant';
import { type BatchState } from 'src/stock-picking-batch/types/batch-state.type';
import { MOVE_SPLIT_MESSAGES } from 'src/stock/move/move-split-messages.constant';
import { type MoveSplitPlan } from 'src/stock/move/types/move-split-plan.type';
import { StockUserError } from 'src/stock/stock-errors';

class Stopped extends Error {}

type Picking = {
  id: string;
  name: string;
  state: string;
  pickingTypeId: string | null;
  batchId: string | null;
  scheduledDate: string;
};
type Move = { id: string; pickingId: string; demand: number };
type Line = { id: string; pickingId: string | null; moveId: string | null; quantity: number };
type Batch = { id: string; name: string; state: BatchState; isWave: boolean; pickingTypeId: string | null; responsibleId: string | null };

const picking = (id: string, values: Partial<Picking> = {}): Picking => ({
  id,
  name: `WH/OUT/${id}`,
  state: 'ASSIGNED',
  pickingTypeId: 'out',
  batchId: null,
  scheduledDate: '2025-01-01T00:00:00.000Z',
  ...values,
});

// Three ready deliveries: P1 has product A (three lots of 5) and product B
// (five serials), P2 has product A (one lot of 5), P3 has product B (five serials).
const makeFakeWave = ({ autoConfirm = true, auto = false }: { autoConfirm?: boolean; auto?: boolean } = {}) => {
  const claimStore = makeFakeClaimStore();
  const pickings = new Map<string, Picking>([
    ['P1', picking('P1')],
    ['P2', picking('P2')],
    ['P3', picking('P3')],
  ]);
  const moves = new Map<string, Move>([
    ['P1-A', { id: 'P1-A', pickingId: 'P1', demand: 15 }],
    ['P1-B', { id: 'P1-B', pickingId: 'P1', demand: 5 }],
    ['P2-A', { id: 'P2-A', pickingId: 'P2', demand: 5 }],
    ['P3-B', { id: 'P3-B', pickingId: 'P3', demand: 5 }],
  ]);
  const lines = new Map<string, Line>(
    [
      ['a1', 'P1', 'P1-A', 5],
      ['a2', 'P1', 'P1-A', 5],
      ['a3', 'P1', 'P1-A', 5],
      ['b1', 'P1', 'P1-B', 1],
      ['b2', 'P1', 'P1-B', 1],
      ['b3', 'P1', 'P1-B', 1],
      ['b4', 'P1', 'P1-B', 1],
      ['b5', 'P1', 'P1-B', 1],
      ['c1', 'P2', 'P2-A', 5],
      ['d1', 'P3', 'P3-B', 1],
      ['d2', 'P3', 'P3-B', 1],
      ['d3', 'P3', 'P3-B', 1],
      ['d4', 'P3', 'P3-B', 1],
      ['d5', 'P3', 'P3-B', 1],
    ].map(([id, pickingId, moveId, quantity]) => [
      id as string,
      { id: id as string, pickingId: pickingId as string, moveId: moveId as string, quantity: quantity as number },
    ]),
  );
  const batches = new Map<string, Batch>();
  const calls: string[] = [];
  const faults = { stopAtSplit: false, gate: null as Promise<void> | null };
  let splitCount = 0;

  const flow = makeAddToWave({
    claims: makeClaims(claimStore.store),
    digits: () => 2,
    readLines: async (lineIds) => {
      await faults.gate;
      return lineIds.flatMap((id) => {
        const line = lines.get(id);

        return line === undefined ? [] : [{ id, pickingId: line.pickingId, moveId: line.moveId, quantityProductUom: line.quantity }];
      });
    },
    readPickings: async (pickingIds) => ({
      pickings: pickingIds.flatMap((id) => {
        const row = pickings.get(id);

        return row === undefined ? [] : [{ ...row, copyValues: { pickingTypeId: row.pickingTypeId, scheduledDate: row.scheduledDate } }];
      }),
      lines: [...lines.values()].flatMap((line) =>
        line.pickingId !== null && pickingIds.includes(line.pickingId) ? [{ id: line.id, pickingId: line.pickingId, moveId: line.moveId }] : [],
      ),
      moves: [...moves.values()].filter((move) => pickingIds.includes(move.pickingId)),
    }),
    readWave: async (waveId) => batches.get(waveId),
    planMoveSplit: async (moveId, quantity, target): Promise<MoveSplitPlan> => {
      if (quantity === 0) {
        throw new StockUserError(MOVE_SPLIT_MESSAGES.nothing);
      }
      return {
        moveId,
        state: 'ASSIGNED',
        productId: 'product',
        newMoveId: `${moveId}-split-${(splitCount += 1)}`,
        newValues: { pickingId: target.pickingId, productUomQty: quantity },
        moveOrigIds: [],
        moveDestIds: [],
        referenceIds: [],
        originalDemand: (moves.get(moveId)?.demand ?? 0) - quantity,
        lineIds: target.lineIds,
      };
    },
    createWave: async (waveId, values) => {
      calls.push('createWave');
      if (!batches.has(waveId)) {
        batches.set(waveId, { id: waveId, name: 'New', state: 'DRAFT', ...values });
      }
    },
    typeWave: async (waveId, pickingTypeId) => {
      calls.push('typeWave');
      Object.assign(batches.get(waveId) ?? {}, { pickingTypeId });
    },
    joinWave: async (pickingIds, waveId) => {
      calls.push(`joinWave ${pickingIds.join(',')}`);
      pickingIds.forEach((id) => {
        const row = pickings.get(id);

        if (row !== undefined) {
          row.batchId = waveId;
        }
      });
    },
    createSplitPicking: async (pickingId, values) => {
      calls.push('createSplitPicking');
      if (!pickings.has(pickingId)) {
        pickings.set(pickingId, {
          ...picking(pickingId, { name: `WH/OUT/${pickings.size + 1}`, state: 'DRAFT' }),
          ...(values as Partial<Picking>),
        });
      }
    },
    moveToPicking: async (moveIds, lineIds, pickingId) => {
      calls.push('moveToPicking');
      moveIds.forEach((id) => Object.assign(moves.get(id) ?? {}, { pickingId }));
      lineIds.forEach((id) => Object.assign(lines.get(id) ?? {}, { pickingId }));
    },
    applyMoveSplit: async (plan) => {
      calls.push('applyMoveSplit');
      if (faults.stopAtSplit) {
        faults.stopAtSplit = false;
        throw new Stopped();
      }
      if (!moves.has(plan.newMoveId)) {
        moves.set(plan.newMoveId, {
          id: plan.newMoveId,
          pickingId: plan.newValues.pickingId as string,
          demand: plan.newValues.productUomQty as number,
        });
      }
      plan.lineIds.forEach((id) => Object.assign(lines.get(id) ?? {}, { moveId: plan.newMoveId, pickingId: plan.newValues.pickingId }));
      Object.assign(moves.get(plan.moveId) ?? {}, { demand: plan.originalDemand });

      return plan.newMoveId;
    },
    recomputePickingState: async (pickingIds) => {
      calls.push('recomputePickingState');
      pickingIds.forEach((id) => {
        const row = pickings.get(id);
        const hasMoves = [...moves.values()].some((move) => move.pickingId === id);

        if (row !== undefined) {
          row.state = hasMoves ? 'ASSIGNED' : 'DRAFT';
        }
      });
    },
    readAutoConfirm: async () => autoConfirm,
    confirmBatch: async (batchId) => {
      calls.push('confirmBatch');
      Object.assign(batches.get(batchId) ?? {}, { state: 'IN_PROGRESS' });
    },
    recomputeBatchState: async () => {
      calls.push('recomputeBatchState');
    },
    readBatchName: async (batchId) => {
      const batch = batches.get(batchId);

      return batch === undefined || batch.name === 'New' ? 'WAVE/OUT/00001' : batch.name;
    },
  }, auto ? { readWaveBatchIds: async (batchIds) => new Set(batchIds.filter((id) => batches.get(id)?.isWave === true)) } : {});

  const inWave = (waveId: string) =>
    [...pickings.values()].filter((row) => row.batchId === waveId).map((row) => row.id);
  const newPickings = () => [...pickings.values()].filter((row) => !['P1', 'P2', 'P3'].includes(row.id));
  const linesOf = (pickingId: string) =>
    [...lines.values()].filter((line) => line.pickingId === pickingId).map((line) => line.id);
  const movesOf = (pickingId: string) =>
    [...moves.values()].filter((move) => move.pickingId === pickingId).map((move) => move.id);

  return { claimStore, pickings, moves, lines, batches, calls, faults, flow, inWave, newPickings, linesOf, movesOf };
};

const ALL_LINES = ['a1', 'a2', 'a3', 'b1', 'b2', 'b3', 'b4', 'b5', 'c1', 'd1', 'd2', 'd3', 'd4', 'd5'];

describe('addToWave', () => {
  it('puts every transfer whose lines are all chosen into a new wave whole, with the chosen responsible', async () => {
    const fake = makeFakeWave();

    const result = await fake.flow.addToWave({ lineIds: ALL_LINES, waveId: null, responsibleId: 'demo' });

    if (result.kind !== 'done') {
      throw new Error('held');
    }
    expect({
      result: { waveName: result.waveName, created: result.created },
      wave: fake.batches.get(result.waveId),
      inWave: fake.inWave(result.waveId),
      newTransfers: fake.newPickings().length,
      claims: fake.claimStore.rows.size,
    }).toEqual({
      result: { waveName: 'WAVE/OUT/00001', created: true },
      wave: {
        id: result.waveId,
        name: 'New',
        state: 'IN_PROGRESS',
        isWave: true,
        pickingTypeId: 'out',
        responsibleId: 'demo',
        description: null,
      },
      inWave: ['P1', 'P2', 'P3'],
      newTransfers: 0,
      claims: 0,
    });
  });

  it("moves one move's lines to a new transfer in the wave that keeps the old scheduled date", async () => {
    const fake = makeFakeWave();

    const result = await fake.flow.addToWave({ lineIds: ['b1', 'b2', 'b3', 'b4', 'b5'], waveId: null });

    if (result.kind !== 'done') {
      throw new Error('held');
    }
    const [split] = fake.newPickings();

    expect({
      inWave: fake.inWave(result.waveId),
      original: { batchId: fake.pickings.get('P1')?.batchId, moves: fake.movesOf('P1') },
      split: { moves: fake.movesOf(split.id), lines: fake.linesOf(split.id), scheduledDate: split.scheduledDate },
    }).toEqual({
      inWave: [split.id],
      original: { batchId: null, moves: ['P1-A'] },
      split: { moves: ['P1-B'], lines: ['b1', 'b2', 'b3', 'b4', 'b5'], scheduledDate: '2025-01-01T00:00:00.000Z' },
    });
  });

  it('splits a move for two of its five lines and puts the new part in the wave', async () => {
    const fake = makeFakeWave();

    const result = await fake.flow.addToWave({ lineIds: ['d1', 'd2'], waveId: null });

    if (result.kind !== 'done') {
      throw new Error('held');
    }
    const [split] = fake.newPickings();
    const [newMoveId] = fake.movesOf(split.id);

    expect({
      inWave: fake.inWave(result.waveId),
      original: { batchId: fake.pickings.get('P3')?.batchId, lines: fake.linesOf('P3'), demand: fake.moves.get('P3-B')?.demand },
      split: { lines: fake.linesOf(split.id), demand: fake.moves.get(newMoveId)?.demand, movedLines: ['d1', 'd2'].map((id) => fake.lines.get(id)?.moveId) },
    }).toEqual({
      inWave: [split.id],
      original: { batchId: null, lines: ['d3', 'd4', 'd5'], demand: 3 },
      split: { lines: ['d1', 'd2'], demand: 2, movedLines: [newMoveId, newMoveId] },
    });
  });

  it('makes the split transfer in the wave, with the clicking user as its responsible, before its moves move in', async () => {
    const fake = makeFakeWave();

    const result = await fake.flow.addToWave({ lineIds: ['a1', 'b1', 'b2', 'b3', 'b4', 'b5'], waveId: null, actingMemberId: 'me' });
    const [split] = fake.newPickings() as (Picking & { responsibleUserId?: string })[];

    expect({
      calls: fake.calls.slice(1),
      inWave: result.kind === 'done' ? fake.inWave(result.waveId) : [],
      responsible: split.responsibleUserId,
    }).toEqual({
      calls: ['joinWave ', 'createSplitPicking', 'moveToPicking', 'applyMoveSplit', 'recomputePickingState', 'confirmBatch'],
      inWave: [split.id],
      responsible: 'me',
    });
  });

  it('gives an open wave with no operation type the type of the lines before they join', async () => {
    const fake = makeFakeWave();
    fake.batches.set('W1', { id: 'W1', name: 'New', state: 'IN_PROGRESS', isWave: true, pickingTypeId: null, responsibleId: null });

    await fake.flow.addToWave({ lineIds: ['d1'], waveId: 'W1' });

    expect({ type: fake.batches.get('W1')?.pickingTypeId, calls: fake.calls.slice(0, 2) }).toEqual({
      type: 'out',
      calls: ['typeWave', 'joinWave '],
    });
  });

  it('adds the lines of another transfer to an existing wave', async () => {
    const fake = makeFakeWave();
    fake.batches.set('W1', { id: 'W1', name: 'WAVE/OUT/00007', state: 'IN_PROGRESS', isWave: true, pickingTypeId: 'out', responsibleId: null });
    Object.assign(fake.pickings.get('P1') ?? {}, { batchId: 'W1' });

    const result = await fake.flow.addToWave({ lineIds: ['c1'], waveId: 'W1' });

    expect({ result, inWave: fake.inWave('W1') }).toEqual({
      result: { kind: 'done', waveId: 'W1', waveName: 'WAVE/OUT/00007', created: false },
      inWave: ['P1', 'P2'],
    });
  });

  it('leaves a new wave in draft when its operation type does not confirm waves', async () => {
    const fake = makeFakeWave({ autoConfirm: false });

    const result = await fake.flow.addToWave({ lineIds: ['c1'], waveId: null });

    expect(result.kind === 'done' ? fake.batches.get(result.waveId)?.state : 'held').toBe('DRAFT');
  });

  it.each([
    ['no lines are chosen', [] as string[], null, BATCH_MESSAGES.noWaveLines],
    ['a line has no transfer', ['loose'], null, BATCH_MESSAGES.noWaveLines],
    ['the transfers have different operation types', ['c1', 'd1'], null, BATCH_MESSAGES.sameType],
    ['the chosen batch is not a wave', ['c1'], 'B1', BATCH_MESSAGES.chooseWave],
    ['the chosen wave is done', ['c1'], 'W9', BATCH_MESSAGES.chooseWave],
    ['a transfer is done', ['a1'], null, BATCH_MESSAGES.incompatible],
  ])('refuses and writes nothing when %s', async (_case, lineIds, waveId, message) => {
    const fake = makeFakeWave();
    fake.lines.set('loose', { id: 'loose', pickingId: null, moveId: null, quantity: 1 });
    Object.assign(fake.pickings.get('P3') ?? {}, { pickingTypeId: 'in' });
    Object.assign(fake.pickings.get('P1') ?? {}, { state: 'DONE' });
    fake.batches.set('B1', { id: 'B1', name: 'BATCH/OUT/00001', state: 'IN_PROGRESS', isWave: false, pickingTypeId: 'out', responsibleId: null });
    fake.batches.set('W9', { id: 'W9', name: 'WAVE/OUT/00009', state: 'DONE', isWave: true, pickingTypeId: 'out', responsibleId: null });

    await expect(fake.flow.addToWave({ lineIds, waveId })).rejects.toThrow(message);
    expect({ calls: fake.calls, claims: fake.claimStore.rows.size }).toEqual({ calls: [], claims: 0 });
  });

  it('finishes a run stopped half-way from its plan, without a second split transfer', async () => {
    const fake = makeFakeWave();
    fake.faults.stopAtSplit = true;

    await expect(fake.flow.addToWave({ lineIds: ['d1', 'd2'], waveId: null })).rejects.toBeInstanceOf(Stopped);
    fake.claimStore.advanceMinutes(16);
    await fake.flow.resumeAddToWave('d1');

    const splits = fake.newPickings();

    expect({
      splits: splits.length,
      inWave: splits.map((row) => row.batchId !== null),
      lines: fake.linesOf(splits[0].id),
      waves: fake.batches.size,
      claims: fake.claimStore.rows.size,
    }).toEqual({ splits: 1, inWave: [true], lines: ['d1', 'd2'], waves: 1, claims: 0 });
  });

  it('frees a run that stopped before its first write and writes nothing on resume', async () => {
    const fake = makeFakeWave();
    const runId = 'stopped-run';
    await fake.claimStore.store.create({
      key: 'wave:d1',
      runId,
      startedAt: '2026-10-08T09:00:00.000Z',
      progress: {
        steps: {
          'wave:plan': {
            plan: { kind: 'wave', waveId: 'W2', newWave: null, typeWave: null, pickingTypeId: 'out', wholePickingIds: ['P3'], splits: [], memberKeys: [], claimRunId: runId },
            done: true,
          },
        },
      },
    });

    await fake.flow.resumeAddToWave('d1');

    expect({ calls: fake.calls, claims: fake.claimStore.rows.size }).toEqual({ calls: [], claims: 0 });
  });

  it('counts a line chosen twice once', async () => {
    const fake = makeFakeWave();

    await fake.flow.addToWave({ lineIds: ['d1', 'd1', 'd2'], waveId: null });

    expect(fake.moves.get('P3-B')?.demand).toBe(3);
  });

  it('refuses a second selection that shares a line with a running one, and no move is split twice', async () => {
    const fake = makeFakeWave();
    let open = () => {};
    fake.faults.gate = new Promise<void>((resolve) => {
      open = resolve;
    });

    const first = fake.flow.addToWave({ lineIds: ['d1', 'd3'], waveId: null });

    for (let turn = 0; turn < 100 && fake.claimStore.rows.size < 2; turn += 1) {
      await Promise.resolve();
    }
    fake.faults.gate = null;
    const second = await fake.flow.addToWave({ lineIds: ['d2', 'd3'], waveId: null });

    open();
    await first;
    expect({
      second,
      splitMoves: [...fake.moves.keys()].filter((id) => id.includes('split')).length,
      demand: fake.moves.get('P3-B')?.demand,
      claims: fake.claimStore.rows.size,
    }).toEqual({ second: { kind: 'held' }, splitMoves: 1, demand: 3, claims: 0 });
  });

  it('answers "try again" to a click that takes over a stopped run before its first write, then lets the next click through', async () => {
    const fake = makeFakeWave();
    await fake.claimStore.store.create({
      key: 'wave:d1',
      runId: 'stopped-run',
      startedAt: '2026-10-08T09:00:00.000Z',
      progress: {
        steps: {
          'wave:plan': {
            plan: { kind: 'wave', waveId: 'W2', newWave: null, typeWave: null, pickingTypeId: 'out', wholePickingIds: ['P3'], splits: [], memberKeys: [], claimRunId: 'stopped-run' },
            done: true,
          },
        },
      },
    });

    const first = await fake.flow.addToWave({ lineIds: ['d1'], waveId: null });
    const second = await fake.flow.addToWave({ lineIds: ['d1'], waveId: null });

    expect({ first, second: second.kind, p3: fake.pickings.get('P3')?.batchId === 'W2', claims: fake.claimStore.rows.size }).toEqual({
      first: { kind: 'held' },
      second: 'done',
      p3: false,
      claims: 0,
    });
  });

  it('answers "try again" to a click that takes over a stopped run past its first write, and finishes that run', async () => {
    const fake = makeFakeWave();
    fake.faults.stopAtSplit = true;

    await expect(fake.flow.addToWave({ lineIds: ['d1', 'd2'], waveId: null })).rejects.toBeInstanceOf(Stopped);
    fake.claimStore.advanceMinutes(16);
    const click = await fake.flow.addToWave({ lineIds: ['d1', 'd4'], waveId: null });

    expect({
      click,
      splitLines: fake.newPickings().map((row) => fake.linesOf(row.id)),
      claims: fake.claimStore.rows.size,
    }).toEqual({ click: { kind: 'held' }, splitLines: [['d1', 'd2']], claims: 0 });
  });

  it('auto wave leaves a line whose transfer a wave took meanwhile, and writes nothing when no line is left', async () => {
    const fake = makeFakeWave({ auto: true });
    fake.batches.set('W1', { id: 'W1', name: 'WAVE/OUT/00007', state: 'IN_PROGRESS', isWave: true, pickingTypeId: 'out', responsibleId: null });
    Object.assign(fake.pickings.get('P3') ?? {}, { batchId: 'W1' });

    const alone = await fake.flow.addToWave({ lineIds: ['d1'], waveId: null });
    const callsAfterAlone = [...fake.calls];
    const mixed = await fake.flow.addToWave({ lineIds: ['c1', 'd1'], waveId: null });

    expect({
      alone,
      callsAfterAlone,
      mixed: mixed.kind === 'done' ? fake.inWave(mixed.waveId) : mixed,
      p3: fake.pickings.get('P3')?.batchId,
      claims: fake.claimStore.rows.size,
    }).toEqual({ alone: { kind: 'held' }, callsAfterAlone: [], mixed: ['P2'], p3: 'W1', claims: 0 });
  });

  it('frees the stale claim of another line of a stopped run', async () => {
    const fake = makeFakeWave();
    await fake.claimStore.store.create({ key: 'wave:d2', runId: 'stopped-run', startedAt: '2026-10-08T09:00:00.000Z', progress: { steps: {} } });

    await fake.flow.resumeAddToWave('d2');

    expect(fake.claimStore.rows.size).toBe(0);
  });

  it('refuses lines that add up to zero on a move whose other lines stay, and writes nothing', async () => {
    const fake = makeFakeWave();
    Object.assign(fake.lines.get('d1') ?? {}, { quantity: 0 });

    await expect(fake.flow.addToWave({ lineIds: ['d1'], waveId: null })).rejects.toThrow(MOVE_SPLIT_MESSAGES.nothing);
    expect({ calls: fake.calls, claims: fake.claimStore.rows.size }).toEqual({ calls: [], claims: 0 });
  });

  it('finishes the stopped run first when a click starts on another line of that run, and the move loses its quantity once', async () => {
    const fake = makeFakeWave();
    fake.faults.stopAtSplit = true;

    await expect(fake.flow.addToWave({ lineIds: ['d1', 'd2'], waveId: null })).rejects.toBeInstanceOf(Stopped);
    fake.claimStore.advanceMinutes(16);
    const click = await fake.flow.addToWave({ lineIds: ['d2'], waveId: null });

    expect({
      click,
      demand: fake.moves.get('P3-B')?.demand,
      splitLines: fake.newPickings().map((row) => fake.linesOf(row.id)),
      claims: fake.claimStore.rows.size,
    }).toEqual({ click: { kind: 'held' }, demand: 3, splitLines: [['d1', 'd2']], claims: 0 });
  });

  it('finishes the stopped run when the daily job reaches another line of it first', async () => {
    const fake = makeFakeWave();
    fake.faults.stopAtSplit = true;

    await expect(fake.flow.addToWave({ lineIds: ['d1', 'd2'], waveId: null })).rejects.toBeInstanceOf(Stopped);
    fake.claimStore.advanceMinutes(16);
    await fake.flow.resumeAddToWave('d2');

    expect({
      demand: fake.moves.get('P3-B')?.demand,
      splitLines: fake.newPickings().map((row) => fake.linesOf(row.id)),
      claims: fake.claimStore.rows.size,
    }).toEqual({ demand: 3, splitLines: [['d1', 'd2']], claims: 0 });
  });

  it('keeps another line of a run held while that run still goes', async () => {
    const fake = makeFakeWave();
    await fake.claimStore.store.create({ key: 'wave:d1', runId: 'live-run', startedAt: '2026-10-08T10:00:00.000Z' });
    await fake.claimStore.store.create({
      key: 'wave:d2',
      runId: 'old-run',
      startedAt: '2026-10-08T09:00:00.000Z',
      progress: { steps: {}, owner: 'wave:d1' },
    });

    await fake.flow.resumeAddToWave('d2');

    expect([...fake.claimStore.rows.keys()].sort()).toEqual(['wave:d1', 'wave:d2']);
  });

  it('frees the other lines of a run stopped before its first write', async () => {
    const fake = makeFakeWave();
    await fake.claimStore.store.create({
      key: 'wave:d1',
      runId: 'stopped-run',
      startedAt: '2026-10-08T09:00:00.000Z',
      progress: {
        steps: {
          'wave:plan': {
            plan: { kind: 'wave', waveId: 'W2', newWave: null, typeWave: null, pickingTypeId: 'out', wholePickingIds: ['P3'], splits: [], memberKeys: ['wave:d2'], claimRunId: 'stopped-run' },
            done: true,
          },
        },
      },
    });
    await fake.claimStore.store.create({ key: 'wave:d2', runId: 'stopped-run', startedAt: '2026-10-08T09:00:00.000Z', progress: { steps: {}, owner: 'wave:d1' } });

    await fake.flow.resumeAddToWave('d1');

    expect({ calls: fake.calls, claims: fake.claimStore.rows.size }).toEqual({ calls: [], claims: 0 });
  });
});
