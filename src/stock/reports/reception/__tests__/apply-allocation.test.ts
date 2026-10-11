import { describe, expect, it } from 'vitest';

import { CLAIM_HELD_MESSAGE, makeClaims } from 'src/shared/claims/claim';
import { makeFakeClaimStore } from 'src/shared/claims/__tests__/fakes/fake-claim-store';
import { type MoveSplitPlan } from 'src/stock/move/types/move-split-plan.type';
import { makeAllocationHolds } from 'src/stock/reports/reception/allocation-holds';
import { makeAllocation } from 'src/stock/reports/reception/apply-allocation';
import { type AllocationRequest } from 'src/stock/reports/reception/types/allocation-request.type';
import { type ProcureMethod } from 'src/stock/types/procure-method.type';
import { type MoveState } from 'src/stock/types/move-state.type';
import { type ResolvedUom } from 'src/uom/utils/types/resolved-uom.type';

class Stopped extends Error {}

type Move = { id: string; pickingId: string | null; productQty: number; state: MoveState; procureMethod: ProcureMethod };
type Line = { moveId: string; quantity: number; state: MoveState };

const UOMS = new Map<string, ResolvedUom>([['unit', { id: 'unit', name: 'Units', factor: 1, rootId: 'unit', parentPath: 'unit/' }]]);

// A delivery of 10 waiting for stock, a confirmed receipt of 4, and a second
// confirmed receipt of 3. Writes to a line or move that is gone fail, as the
// database answers them.
const makeFakeAllocation = () => {
  const claimStore = makeFakeClaimStore();
  const claims = makeClaims(claimStore.store);
  const moves = new Map<string, Move>(
    [
      { id: 'out', pickingId: 'DELIVERY', productQty: 10, state: 'CONFIRMED' as const, procureMethod: 'MAKE_TO_STOCK' as const },
      { id: 'in', pickingId: 'RECEIPT', productQty: 4, state: 'ASSIGNED' as const, procureMethod: 'MAKE_TO_STOCK' as const },
      { id: 'in2', pickingId: 'RECEIPT2', productQty: 3, state: 'ASSIGNED' as const, procureMethod: 'MAKE_TO_STOCK' as const },
    ].map((move) => [move.id, move]),
  );
  const lines = new Map<string, Line>();
  const links = new Set<string>();
  const calls: string[] = [];
  const counts = { reads: 0, splitPlans: 0 };
  const faults = { stopAt: null as string | null };

  const stopAt = (point: string) => {
    if (faults.stopAt === point) {
      faults.stopAt = null;
      throw new Stopped(point);
    }
  };
  const origsOf = (moveId: string) =>
    [...links].map((link) => link.split('|')).filter(([, dest]) => dest === moveId).map(([orig]) => orig);
  const destsOf = (moveId: string) =>
    [...links].map((link) => link.split('|')).filter(([orig]) => orig === moveId).map(([, dest]) => dest);
  const demand = (moveId: string) => moves.get(moveId)?.productQty ?? 0;
  const linesOf = (moveId: string) => [...lines.entries()].filter(([, line]) => line.moveId === moveId);
  const lineOrFail = (lineId: string) => {
    const line = lines.get(lineId);

    if (line === undefined) {
      throw new Error(`Line ${lineId} not found.`);
    }
    return line;
  };

  const flow = makeAllocation({
    claims,
    digits: () => 2,
    uoms: async () => UOMS,
    readMovePickingIds: async (moveIds) => new Map(moveIds.map((id) => [id, moves.get(id)?.pickingId ?? null])),
    readInputs: async (request: AllocationRequest) => {
      counts.reads += 1;
      stopAt('read');
      return {
        lines: new Map([...lines.entries()].map(([id, line]) => [id, { quantity: line.quantity, productUomId: 'unit', productUnitUomId: 'unit' }])),
        allocations: request.flatMap((entry) => {
          const out = moves.get(entry.moveId);

          return out === undefined
            ? []
            : [
                {
                  out: {
                    id: out.id,
                    productId: 'P',
                    productQty: out.productQty,
                    quantity: linesOf(out.id).reduce((total, [, line]) => total + line.quantity, 0),
                    state: out.state,
                    reservationDate: null,
                    pickingId: out.pickingId,
                    referenceIds: [],
                    lines: linesOf(out.id).map(([id, line]) => ({ id, quantityProductUom: line.quantity, locationId: 'stock' })),
                    moveOrigs: origsOf(out.id).map((id) => ({ id, productQty: demand(id) })),
                  },
                  quantity: entry.quantity,
                  ins: entry.inIds.flatMap((inId) => {
                    const incoming = moves.get(inId);

                    return incoming === undefined
                      ? []
                      : [
                          {
                            id: incoming.id,
                            productId: 'P',
                            productQty: incoming.productQty,
                            quantity: 0,
                            state: incoming.state,
                            locationDestId: 'stock',
                            destDemand: destsOf(inId).reduce((total, id) => total + demand(id), 0),
                            pickingId: incoming.pickingId,
                            referenceIds: [],
                            isLinkedToOut: destsOf(inId).includes(out.id),
                          },
                        ];
                  }),
                },
              ];
        }),
      };
    },
    readMoveStates: async (moveIds) => new Map(moveIds.flatMap((id) => (moves.has(id) ? [[id, moves.get(id)?.state ?? 'CONFIRMED']] : []))),
    readLineStates: async (lineIds) => new Map(lineIds.flatMap((id) => (lines.has(id) ? [[id, lines.get(id)?.state ?? 'ASSIGNED']] : []))),
    planMoveSplit: async (moveId, quantity, { newMoveId }): Promise<MoveSplitPlan> => {
      counts.splitPlans += 1;
      return {
        moveId,
        state: moves.get(moveId)?.state ?? 'CONFIRMED',
        productId: 'P',
        newMoveId,
        newValues: { pickingId: moves.get(moveId)?.pickingId, productUomQty: quantity },
        moveOrigIds: origsOf(moveId),
        moveDestIds: [],
        referenceIds: [],
        originalDemand: demand(moveId) - quantity,
        lineIds: [],
      };
    },
    applyMoveSplit: async (plan) => {
      stopAt('split');
      calls.push(`split ${plan.moveId}`);
      if (!moves.has(plan.newMoveId)) {
        moves.set(plan.newMoveId, {
          id: plan.newMoveId,
          pickingId: plan.newValues.pickingId as string,
          productQty: plan.newValues.productUomQty as number,
          state: plan.state,
          procureMethod: (plan.newValues.procureMethod as ProcureMethod | undefined) ?? 'MAKE_TO_STOCK',
        });
      }
      plan.moveOrigIds.forEach((orig) => links.add(`${orig}|${plan.newMoveId}`));
      Object.assign(moves.get(plan.moveId) ?? {}, { productQty: plan.originalDemand });
      return plan.newMoveId;
    },
    writeLines: async (writes) => {
      stopAt('lines');
      for (const write of writes) {
        const line = lineOrFail(write.lineId);

        if (write.kind === 'move') {
          line.moveId = write.moveId;
          continue;
        }
        if (!lines.has(write.copyId)) {
          lines.set(write.copyId, { moveId: write.copyMoveId, quantity: write.copyQuantity, state: line.state });
        }
        Object.assign(line, { moveId: write.moveId, quantity: write.quantity });
      }
    },
    linkMoves: async (pairs) => {
      stopAt('link');
      pairs.forEach((pair) => links.add(`${pair.moveOrigId}|${pair.moveDestId}`));
    },
    unlinkMoves: async (pairs) => {
      pairs.forEach((pair) => links.delete(`${pair.moveOrigId}|${pair.moveDestId}`));
    },
    setProcureMethod: async (moveIds, procureMethod) => {
      moveIds.forEach((id) => Object.assign(moves.get(id) ?? {}, { procureMethod }));
    },
    addReferences: async () => {},
    removeReferences: async () => {},
    recompute: async () => {},
    assignMoves: async (moveIds) => {
      calls.push(`reserve ${moveIds.join(',')}`);
    },
    unreserveMoves: async (moveIds) => {
      stopAt('unreserve');
      calls.push(`unreserve ${moveIds.join(',')}`);
    },
  });

  return { flow, claims, claimStore, moves, lines, links, calls, counts, faults };
};

const deliveryMoves = (moves: Map<string, Move>) => [...moves.values()].filter((move) => move.pickingId === 'DELIVERY');

const ALLOCATE_4: AllocationRequest = [{ moveId: 'out', quantity: 4, inIds: ['in'] }];

const heldMessage = expect.objectContaining({ message: CLAIM_HELD_MESSAGE });

describe('allocate', () => {
  it('splits the delivery, links the receipt, reserves again and frees every transfer it held', async () => {
    const { flow, claimStore, moves, links, calls } = makeFakeAllocation();

    await flow.allocate(ALLOCATE_4);

    expect(moves.get('out')).toMatchObject({ productQty: 4, procureMethod: 'MAKE_TO_ORDER' });
    expect([...moves.values()].filter((move) => move.pickingId === 'DELIVERY').map((move) => move.productQty)).toEqual([4, 6]);
    expect([...links]).toEqual(['in|out']);
    expect(calls).toEqual(['split out', 'reserve out']);
    expect([...claimStore.rows.keys()]).toEqual([]);
  });

  it('answers "try again" while another run holds the receipt, and writes nothing', async () => {
    const { flow, claimStore, moves, calls } = makeFakeAllocation();

    await claimStore.store.create({ key: 'allocate:RECEIPT', runId: 'other', startedAt: claimStore.store.now().toISOString() });

    await expect(flow.allocate(ALLOCATE_4)).rejects.toEqual(heldMessage);
    expect(calls).toEqual([]);
    expect(moves.get('out')?.productQty).toBe(10);
    expect([...claimStore.rows.keys()]).toEqual(['allocate:RECEIPT']);
  });

  it('answers "try again" while the delivery is being validated, and writes nothing', async () => {
    const { flow, claimStore, calls } = makeFakeAllocation();

    await claimStore.store.create({ key: 'validate:DELIVERY', runId: 'other', startedAt: claimStore.store.now().toISOString() });

    await expect(flow.allocate(ALLOCATE_4)).rejects.toEqual(heldMessage);
    expect(calls).toEqual([]);
    expect([...claimStore.rows.keys()]).toEqual(['validate:DELIVERY']);
  });

  it('frees every transfer when it stops before its first write', async () => {
    const { flow, claimStore, faults, calls } = makeFakeAllocation();

    faults.stopAt = 'read';

    await expect(flow.allocate(ALLOCATE_4)).rejects.toBeInstanceOf(Stopped);
    expect(calls).toEqual([]);
    expect([...claimStore.rows.keys()]).toEqual([]);
  });

  it('keeps every transfer held when it stops after its first write, and the daily job finishes it once', async () => {
    const { flow, claimStore, moves, links, calls, faults } = makeFakeAllocation();

    faults.stopAt = 'link';

    await expect(flow.allocate(ALLOCATE_4)).rejects.toBeInstanceOf(Stopped);
    expect([...claimStore.rows.keys()].sort()).toEqual(['allocate:DELIVERY', 'allocate:RECEIPT']);

    claimStore.advanceMinutes(16);
    // The receipt's claim is reached first: the run it belongs to is finished before it is freed.
    await flow.resumeAllocation('RECEIPT');

    expect([...moves.values()].filter((move) => move.pickingId === 'DELIVERY').map((move) => move.productQty)).toEqual([4, 6]);
    expect([...links]).toEqual(['in|out']);
    expect(calls.filter((call) => call.startsWith('reserve'))).toEqual(['reserve out']);
    expect([...claimStore.rows.keys()]).toEqual([]);
  });

  it('answers "try again" to a click that takes over a stopped run, after finishing that run', async () => {
    const { flow, claimStore, moves, links, faults } = makeFakeAllocation();

    faults.stopAt = 'link';
    await expect(flow.allocate(ALLOCATE_4)).rejects.toBeInstanceOf(Stopped);
    claimStore.advanceMinutes(16);

    await expect(flow.allocate(ALLOCATE_4)).rejects.toEqual(heldMessage);
    expect(moves.get('out')?.productQty).toBe(4);
    expect([...links]).toEqual(['in|out']);
    expect([...claimStore.rows.keys()]).toEqual([]);
  });

  it('refuses a quantity above the demand of the delivery move, and frees what it held', async () => {
    const { flow, claimStore, calls } = makeFakeAllocation();

    await expect(flow.allocate([{ moveId: 'out', quantity: 11, inIds: ['in'] }])).rejects.toMatchObject({
      message: 'The quantity must be more than zero and at most the demand of the delivery move.',
    });
    expect(calls).toEqual([]);
    expect([...claimStore.rows.keys()]).toEqual([]);
  });
});

describe('allocate after a stop', () => {
  // The delivery has 6 of its 10 reserved on one line; the receipt is not in yet.
  const withReservedLine = () => {
    const fake = makeFakeAllocation();

    Object.assign(fake.moves.get('out') ?? {}, { state: 'PARTIALLY_AVAILABLE' });
    fake.lines.set('l1', { moveId: 'out', quantity: 6, state: 'PARTIALLY_AVAILABLE' });
    return fake;
  };

  it('finishes the stored plan without reading or planning again, and the reserved line ends on the remainder', async () => {
    const { flow, claimStore, moves, lines, links, counts, faults } = withReservedLine();

    faults.stopAt = 'link';
    await expect(flow.allocate(ALLOCATE_4)).rejects.toBeInstanceOf(Stopped);
    claimStore.advanceMinutes(16);
    // Reading the moves again would fail now: only the stored plan can finish the run.
    faults.stopAt = 'read';

    await flow.resumeAllocation('DELIVERY');

    const [remainder] = deliveryMoves(moves).filter((move) => move.id !== 'out');

    expect(counts).toEqual({ reads: 1, splitPlans: 1 });
    expect(deliveryMoves(moves).map((move) => move.productQty)).toEqual([4, 6]);
    expect(lines.get('l1')).toMatchObject({ moveId: remainder.id, quantity: 6 });
    expect([...links]).toEqual(['in|out']);
    expect([...claimStore.rows.keys()]).toEqual([]);
  });

  it('skips a planned line that was removed meanwhile and finishes the rest', async () => {
    const { flow, claimStore, lines, links, faults } = withReservedLine();

    faults.stopAt = 'lines';
    await expect(flow.allocate(ALLOCATE_4)).rejects.toBeInstanceOf(Stopped);
    lines.delete('l1');
    claimStore.advanceMinutes(16);

    await flow.resumeAllocation('DELIVERY');

    expect([...links]).toEqual(['in|out']);
    expect([...claimStore.rows.keys()]).toEqual([]);
  });

  it('leaves a delivery move made done meanwhile as it is: no split, its demand and lines untouched', async () => {
    const { flow, claimStore, moves, lines, links, faults } = withReservedLine();

    faults.stopAt = 'split';
    await expect(flow.allocate(ALLOCATE_4)).rejects.toBeInstanceOf(Stopped);
    Object.assign(moves.get('out') ?? {}, { state: 'DONE' });
    Object.assign(lines.get('l1') ?? {}, { state: 'DONE' });
    claimStore.advanceMinutes(16);

    await flow.resumeAllocation('DELIVERY');

    expect(deliveryMoves(moves).map((move) => move.productQty)).toEqual([10]);
    expect(lines.get('l1')).toMatchObject({ moveId: 'out', quantity: 6 });
    expect([...links]).toEqual([]);
    expect([...claimStore.rows.keys()]).toEqual([]);
  });

  it('frees a run whose plan was stored but which stopped before its first write, and writes nothing', async () => {
    const { flow, claimStore, moves, links, calls } = makeFakeAllocation();
    const startedAt = claimStore.store.now().toISOString();
    const run = {
      kind: 'allocate',
      memberKeys: ['allocate:RECEIPT'],
      claimRunId: 'stopped',
      plan: {
        splits: [{ outId: 'out', remainderQty: 6, reservationDate: null }],
        lineSplits: [],
        links: [{ inId: 'in', outId: 'out' }],
        makeToOrder: ['out'],
        references: [],
        assignMoveIds: ['out'],
      },
      splits: [],
      lineWrites: [],
    };

    await claimStore.store.create({
      key: 'allocate:DELIVERY',
      runId: 'stopped',
      startedAt,
      progress: { steps: { 'allocate:plan': { plan: run, done: true } }, committed: false },
    });
    await claimStore.store.create({
      key: 'allocate:RECEIPT',
      runId: 'stopped',
      startedAt,
      progress: { steps: {}, owner: 'allocate:DELIVERY' },
    });
    claimStore.advanceMinutes(16);

    await flow.resumeAllocation('DELIVERY');

    expect(calls).toEqual([]);
    expect([...links]).toEqual([]);
    expect(moves.get('out')).toMatchObject({ productQty: 10, procureMethod: 'MAKE_TO_STOCK' });
    expect([...claimStore.rows.keys()]).toEqual([]);
  });
});

describe('unallocate', () => {
  it('takes one receipt off, keeps the part the other receipt feeds on a new linked move, and unreserves the delivery', async () => {
    const { flow, moves, links, calls } = makeFakeAllocation();

    moves.set('out', { id: 'out', pickingId: 'DELIVERY', productQty: 7, state: 'WAITING', procureMethod: 'MAKE_TO_ORDER' });
    links.add('in|out');
    links.add('in2|out');

    await flow.unallocate({ moveId: 'out', quantity: 3, inIds: ['in2'] });

    const [newMove] = [...moves.values()].filter((move) => move.pickingId === 'DELIVERY' && move.id !== 'out');

    expect(moves.get('out')).toMatchObject({ productQty: 3, procureMethod: 'MAKE_TO_STOCK' });
    expect(newMove).toMatchObject({ productQty: 4, state: 'CONFIRMED', procureMethod: 'MAKE_TO_ORDER' });
    expect([...links]).toEqual([`in|${newMove.id}`]);
    expect(calls).toEqual(['split out', 'unreserve out']);
  });

  it('keeps every transfer held when it stops before unreserving, and the daily job finishes it once', async () => {
    const { flow, claimStore, moves, links, calls, faults } = makeFakeAllocation();

    moves.set('out', { id: 'out', pickingId: 'DELIVERY', productQty: 7, state: 'WAITING', procureMethod: 'MAKE_TO_ORDER' });
    links.add('in|out');
    links.add('in2|out');
    faults.stopAt = 'unreserve';

    await expect(flow.unallocate({ moveId: 'out', quantity: 3, inIds: ['in2'] })).rejects.toBeInstanceOf(Stopped);
    expect([...claimStore.rows.keys()].sort()).toEqual(['allocate:DELIVERY', 'allocate:RECEIPT2']);

    claimStore.advanceMinutes(16);
    await flow.resumeAllocation('RECEIPT2');

    const [newMove] = deliveryMoves(moves).filter((move) => move.id !== 'out');

    expect(deliveryMoves(moves).map((move) => move.productQty)).toEqual([3, 4]);
    expect(moves.get('out')?.procureMethod).toBe('MAKE_TO_STOCK');
    expect([...links]).toEqual([`in|${newMove.id}`]);
    expect(calls.filter((call) => call.startsWith('split'))).toEqual(['split out']);
    expect(calls.filter((call) => call.startsWith('unreserve'))).toEqual(['unreserve out']);
    expect([...claimStore.rows.keys()]).toEqual([]);
  });

  it('frees a stale claim with no stored run, as a forecast reservation leaves one', async () => {
    const { flow, claimStore } = makeFakeAllocation();

    await claimStore.store.create({ key: 'allocate:some-move', runId: 'forecast', startedAt: claimStore.store.now().toISOString() });
    claimStore.advanceMinutes(16);

    await flow.resumeAllocation('some-move');

    expect([...claimStore.rows.keys()]).toEqual([]);
  });
});

describe('flows that reserve, unreserve or validate the same transfers', () => {
  const withHolds = () => {
    const fake = makeFakeAllocation();
    let counter = 0;
    const holds = makeAllocationHolds({
      claims: fake.claims,
      resumeAllocation: fake.flow.resumeAllocation,
      newRunId: () => `hold-${(counter += 1)}`,
    });

    return { ...fake, holds };
  };

  it('answer "try again" while an allocation holds one of their transfers, and do not run', async () => {
    const { claimStore, holds } = withHolds();
    const ran: string[] = [];

    await claimStore.store.create({ key: 'allocate:DELIVERY', runId: 'allocation', startedAt: claimStore.store.now().toISOString() });

    await expect(holds.holdTransfers(['DELIVERY', 'OTHER'], async () => ran.push('unreserve'))).rejects.toEqual(heldMessage);
    expect(ran).toEqual([]);
    expect([...claimStore.rows.keys()]).toEqual(['allocate:DELIVERY']);
  });

  it('make an allocation of their transfers answer "try again" while they run, then free the transfers', async () => {
    const { flow, claimStore, holds, calls } = withHolds();

    await holds.holdTransfers(['RECEIPT'], async () => {
      await expect(flow.allocate(ALLOCATE_4)).rejects.toEqual(heldMessage);
    });

    expect(calls).toEqual([]);
    expect([...claimStore.rows.keys()]).toEqual([]);
  });

  it('finish a stopped allocation of their transfer before they run', async () => {
    const { flow, claimStore, holds, moves, links, faults } = withHolds();
    const seen: number[] = [];

    faults.stopAt = 'link';
    await expect(flow.allocate(ALLOCATE_4)).rejects.toBeInstanceOf(Stopped);
    claimStore.advanceMinutes(16);

    await holds.holdTransfers(['DELIVERY'], async () => {
      seen.push(moves.get('out')?.productQty ?? 0);
    });

    expect(seen).toEqual([4]);
    expect([...links]).toEqual(['in|out']);
    expect([...claimStore.rows.keys()]).toEqual([]);
  });
});
