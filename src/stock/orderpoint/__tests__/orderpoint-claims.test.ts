import { describe, expect, it } from 'vitest';

import { makeClaims } from 'src/shared/claims/claim';
import { makeFakeClaimStore } from 'src/shared/claims/__tests__/fakes/fake-claim-store';
import {
  makeOrderpointClaims,
  orderClaimKey,
  orderFinishClaimKey,
  procurementClaimKey,
} from 'src/stock/orderpoint/orderpoint-claims';
import { makeClaimedProcurements } from 'src/stock/procurement/claimed-procurements';
import { type ClaimJournal } from 'src/shared/claims/types/claim-journal.type';
import { type ClaimRow } from 'src/shared/claims/types/claim-row.type';
import { type ClaimStore } from 'src/shared/claims/types/claim-store.type';
import { type Procurement } from 'src/stock/utils/procurement/types/procurement.type';

const procurement = (name: string): Procurement => ({
  productId: 'desk',
  productQty: 17,
  productUomId: 'unit',
  locationId: 'stock',
  name,
  origin: name,
  values: {},
});

// The procurement engine as the claim sees it: a stored plan, the commit, then
// the writes. `stopAt` makes the server stop before that point.
const setup = () => {
  const fake = makeFakeClaimStore();
  // `failOnce` makes the next save it matches fail, as a lost connection would.
  const failOnce = { matches: null as ((key: string, data: Partial<ClaimRow>) => boolean) | null };
  // `failDestroyOnce` makes the next removal of that claim fail.
  const failDestroyOnce = { key: null as string | null };
  const store: ClaimStore = {
    ...fake.store,
    updateWhere: async (match, data) => {
      if (failOnce.matches?.(match.key, data) === true) {
        failOnce.matches = null;
        throw new Error('save failed');
      }
      return fake.store.updateWhere(match, data);
    },
    destroy: async (match) => {
      if (failDestroyOnce.key === match.key) {
        failDestroyOnce.key = null;
        throw new Error('remove failed');
      }
      return fake.store.destroy(match);
    },
  };
  const claims = makeClaims(store);
  const written: string[] = [];
  const server = { stopAt: null as 'plan' | 'write' | null };
  const run = async (procurements: Procurement[], journal: ClaimJournal, beforeCommit?: () => Promise<void>) => {
    const plan = await journal.step(
      'procurement:plan',
      async () => procurements.map((entry) => entry.name),
      async () => {},
    );

    if (server.stopAt === 'plan') {
      throw new Error('server stopped');
    }
    await beforeCommit?.();
    await journal.commit();
    await journal.step(
      'procurement:write',
      async () => true,
      async () => {
        if (server.stopAt === 'write') {
          throw new Error('server stopped');
        }
        written.push(...plan);
      },
    );
    return plan;
  };
  const procurements = makeClaimedProcurements({ claims, findClaim: store.findByKey, run });
  const finished: string[] = [];
  // `failFinishOnce` makes the next finish stop, as a server stopped mid-way would.
  const failFinishOnce = { armed: false };
  const orderpoints = makeOrderpointClaims({
    claims,
    findClaim: store.findByKey,
    resumeProcurementClaim: procurements.resumeProcurementClaim,
    isProcurementClaimCommitted: procurements.isCommitted,
    finishOrder: async (plan, revertIds = []) => {
      if (failFinishOnce.armed) {
        failFinishOnce.armed = false;
        throw new Error('server stopped');
      }
      finished.push(`clear ${plan.clearTypedIds.join(',')}; back to manual ${revertIds.join(',') || '-'}`);
    },
    revertAutomatic: async (ids) => {
      finished.push(`back to manual ${ids.join(',')}`);
    },
  });

  // One ordering run: claim the rules, order, release; on an error the rules stay only when it had begun writing.
  const order = async (runId: string) => {
    const { taken } = await orderpoints.takeOrderpointClaims(['op1'], runId);

    try {
      await procurements.runClaimedProcurements(procurementClaimKey(runId), [procurement('OP/00001')]);
    } catch (error) {
      await orderpoints.releaseOrderpointClaimsUnlessWritten(taken, runId);
      throw error;
    }
    await orderpoints.releaseOrderpointClaims(taken, runId);
  };

  // One chunk of a button order: its rules are marked on the finish claim
  // right before its procurement claim commits.
  const orderChunk = (runId: string, orderpointIds: string[]) =>
    procurements.runClaimedProcurements(
      procurementClaimKey(runId),
      orderpointIds.map((id) => procurement(`rule ${id}`)),
      { beforeCommit: (claimRunId) => orderpoints.markOrderChunk(runId, orderpointIds, claimRunId) },
    );

  // A button order: its finish step is stored before the first write and done
  // after the procurements; `stopAt: 'finish'` stops the server in between.
  const buttonOrder = async (runId: string, stopAt: 'finish' | null) => {
    const plan = { orderpointIds: ['op1'], clearTypedIds: ['op1'], automaticIds: ['op1'] };
    const { taken } = await orderpoints.takeOrderpointClaims(['op1'], runId);

    await orderpoints.startOrderFinish(runId, plan);
    await orderChunk(runId, ['op1']);
    if (stopAt === 'finish') {
      throw new Error('server stopped');
    }
    await orderpoints.completeOrderFinish(runId, plan, []);
    await orderpoints.releaseOrderpointClaims(taken, runId);
  };

  // A button order over two chunks, the first of op1, the second of op2.
  const twoChunks = { orderpointIds: ['op1', 'op2'], clearTypedIds: ['op1', 'op2'], automaticIds: ['op1', 'op2'] };
  const startTwoChunks = async (runId: string) => {
    const { taken } = await orderpoints.takeOrderpointClaims(['op1', 'op2'], runId);

    await orderpoints.startOrderFinish(runId, twoChunks);

    return taken;
  };

  return {
    fake,
    failOnce,
    failDestroyOnce,
    failFinishOnce,
    server,
    written,
    finished,
    orderpoints,
    procurements,
    order,
    buttonOrder,
    orderChunk,
    startTwoChunks,
  };
};

describe('ordering claims', () => {
  it('a run that stopped while writing keeps its rule until the resume writes its stored plan once', async () => {
    const { fake, server, written, orderpoints, order } = setup();

    server.stopAt = 'write';
    await expect(order('run-A')).rejects.toThrow('server stopped');

    expect(fake.rows.has(orderClaimKey('op1'))).toBe(true);
    expect(await orderpoints.takeOrderpointClaims(['op1'], 'run-B')).toEqual({ taken: [], busy: ['op1'] });

    server.stopAt = null;
    fake.advanceMinutes(16);
    await orderpoints.resumeOrderClaim('op1');
    await orderpoints.resumeOrderClaim('op1');

    expect(written).toEqual(['OP/00001']);
    expect([...fake.rows.keys()]).toEqual([]);
  });

  it('a run that stopped before writing frees its rule at once', async () => {
    const { fake, server, written, order } = setup();

    server.stopAt = 'plan';
    await expect(order('run-A')).rejects.toThrow('server stopped');

    expect(written).toEqual([]);
    expect([...fake.rows.keys()]).toEqual([]);
  });

  it('a later order finishes a stopped run first, then takes the freed rule for itself', async () => {
    const { fake, server, written, orderpoints, order } = setup();

    server.stopAt = 'write';
    await expect(order('run-A')).rejects.toThrow('server stopped');
    server.stopAt = null;
    fake.advanceMinutes(16);

    expect(await orderpoints.takeOrderpointClaims(['op1'], 'run-B')).toEqual({ taken: ['op1'], busy: [] });
    expect(written).toEqual(['OP/00001']);
    expect(fake.rows.get(orderClaimKey('op1'))?.runId).toBe('run-B');
    expect(fake.rows.has(procurementClaimKey('run-A'))).toBe(false);
  });

  it('a rule a stopped run still holds while its writes are not yet stale stays busy', async () => {
    const { fake, orderpoints } = setup();
    const { runClaimedProcurements } = makeClaimedProcurements({
      claims: makeClaims(fake.store),
      findClaim: fake.store.findByKey,
      run: async (_procurements, journal) => {
        await journal.commit();
        throw new Error('server stopped');
      },
    });

    await orderpoints.takeOrderpointClaims(['op1'], 'run-A');
    fake.advanceMinutes(10);
    await expect(runClaimedProcurements(procurementClaimKey('run-A'), [procurement('OP/00001')])).rejects.toThrow(
      'server stopped',
    );
    fake.advanceMinutes(6);

    expect(await orderpoints.takeOrderpointClaims(['op1'], 'run-B')).toEqual({ taken: [], busy: ['op1'] });
  });

  it('keeps the rule while the stopped run is not yet stale where it writes', async () => {
    const { fake, server, written, orderpoints } = setup();
    const { runClaimedProcurements } = makeClaimedProcurements({
      claims: makeClaims(fake.store),
      findClaim: fake.store.findByKey,
      run: async (_procurements, journal) => {
        await journal.commit();
        throw new Error('server stopped');
      },
    });

    await orderpoints.takeOrderpointClaims(['op1'], 'run-A');
    fake.advanceMinutes(10);
    await expect(runClaimedProcurements(procurementClaimKey('run-A'), [procurement('OP/00001')])).rejects.toThrow(
      'server stopped',
    );
    fake.advanceMinutes(6);
    server.stopAt = null;
    await orderpoints.resumeOrderClaim('op1');

    expect(written).toEqual([]);
    expect(fake.rows.has(orderClaimKey('op1'))).toBe(true);
    expect(fake.rows.has(procurementClaimKey('run-A'))).toBe(true);
  });

  it('a button order stopped after ordering is finished by the resume: its typed quantity is cleared, once', async () => {
    const { fake, written, finished, orderpoints, buttonOrder } = setup();

    await expect(buttonOrder('run-A', 'finish')).rejects.toThrow('server stopped');
    fake.advanceMinutes(16);
    await orderpoints.resumeOrderClaim('op1');
    await orderpoints.resumeOrderClaim('op1');

    expect(written).toEqual(['rule op1']);
    expect(finished).toEqual(['clear op1; back to manual -']);
    expect([...fake.rows.keys()]).toEqual([]);
  });

  it('a later click finishes a stopped order first, so the typed quantity is cleared before it orders again', async () => {
    const { fake, written, finished, orderpoints, buttonOrder } = setup();

    await expect(buttonOrder('run-A', 'finish')).rejects.toThrow('server stopped');
    fake.advanceMinutes(16);

    expect(await orderpoints.takeOrderpointClaims(['op1'], 'run-B')).toEqual({ taken: ['op1'], busy: [] });
    expect(written).toEqual(['rule op1']);
    expect(finished).toEqual(['clear op1; back to manual -']);
    expect(fake.rows.has(orderFinishClaimKey('run-A'))).toBe(false);
  });

  it('a button order stopped before its procurement wrote puts the rules it made automatic back to manual on resume', async () => {
    const { fake, written, finished, orderpoints } = setup();
    const claims = makeClaims(fake.store);

    await orderpoints.takeOrderpointClaims(['op1'], 'run-A');
    await orderpoints.startOrderFinish('run-A', {
      orderpointIds: ['op1'],
      clearTypedIds: ['op1'],
      automaticIds: ['op1'],
    });
    await claims.takeClaim(procurementClaimKey('run-A'), 'run-A');
    fake.advanceMinutes(16);
    await orderpoints.resumeOrderClaim('op1');

    expect(written).toEqual([]);
    expect(finished).toEqual(['back to manual op1']);
    expect([...fake.rows.keys()]).toEqual([]);
  });

  it('a refused button order puts the rules it made automatic back to manual and frees them', async () => {
    const { fake, finished, orderpoints } = setup();
    const { taken } = await orderpoints.takeOrderpointClaims(['op1'], 'run-A');

    await orderpoints.startOrderFinish('run-A', { orderpointIds: ['op1'], clearTypedIds: [], automaticIds: ['op1'] });
    await orderpoints.releaseOrderpointClaimsUnlessWritten(taken, 'run-A');

    expect(finished).toEqual(['back to manual op1']);
    expect([...fake.rows.keys()]).toEqual([]);
  });

  it('an error after the first chunk of a big order wrote finishes that chunk, so a retry does not order it again', async () => {
    const { fake, server, written, finished, orderpoints, orderChunk, startTwoChunks } = setup();
    const taken = await startTwoChunks('run-A');

    await orderChunk('run-A', ['op1']);
    server.stopAt = 'plan';
    await expect(orderChunk('run-A', ['op2'])).rejects.toThrow('server stopped');

    expect(await orderpoints.settleOrderRun(taken, 'run-A')).toEqual({ kind: 'finished', writtenIds: ['op1'] });
    expect(written).toEqual(['rule op1']);
    expect(finished).toEqual(['clear op1; back to manual op2']);
    expect([...fake.rows.keys()]).toEqual([]);
  });

  it('a server stop during the second chunk resumes with the first chunk ordered and the second keeping its typed quantity', async () => {
    const { fake, written, finished, orderpoints, orderChunk, startTwoChunks } = setup();
    const claims = makeClaims(fake.store);

    await startTwoChunks('run-A');
    await orderChunk('run-A', ['op1']);
    // The second chunk's claim is taken and its rules marked, then the server stops before the commit.
    await claims.takeClaim(procurementClaimKey('run-A'), 'run-B-chunk');
    await orderpoints.markOrderChunk('run-A', ['op2'], 'run-B-chunk');
    fake.advanceMinutes(16);
    // The procurement claim is resumed through the order run, which reads it first.
    await orderpoints.resumeOrderRun('run-A');
    await orderpoints.resumeOrderClaim('op1');
    await orderpoints.resumeOrderClaim('op2');

    expect(written).toEqual(['rule op1']);
    expect(finished).toEqual(['clear op1; back to manual op2']);
    expect([...fake.rows.keys()]).toEqual([]);
  });

  it('a server stop between two chunks clears only the chunk that was ordered', async () => {
    const { fake, finished, orderpoints, orderChunk, startTwoChunks } = setup();

    await startTwoChunks('run-A');
    await orderChunk('run-A', ['op1']);
    fake.advanceMinutes(16);
    await orderpoints.resumeOrderClaim('op1');
    await orderpoints.resumeOrderClaim('op2');

    expect(finished).toEqual(['clear op1; back to manual op2']);
    expect([...fake.rows.keys()]).toEqual([]);
  });

  it('a server stop before any chunk committed clears nothing', async () => {
    const { fake, finished, orderpoints, startTwoChunks } = setup();

    await startTwoChunks('run-A');
    fake.advanceMinutes(16);
    await orderpoints.resumeOrderClaim('op1');
    await orderpoints.resumeOrderClaim('op2');

    expect(finished).toEqual(['back to manual op1,op2']);
    expect([...fake.rows.keys()]).toEqual([]);
  });

  it('a commit that fails right after the second chunk was marked leaves that chunk unordered, with its typed quantity', async () => {
    const { fake, failOnce, written, finished, orderpoints, orderChunk, startTwoChunks } = setup();
    const taken = await startTwoChunks('run-A');

    await orderChunk('run-A', ['op1']);
    failOnce.matches = (key, data) => key === procurementClaimKey('run-A') && data.progress?.committed === true;
    await expect(orderChunk('run-A', ['op2'])).rejects.toThrow('save failed');

    expect(await orderpoints.settleOrderRun(taken, 'run-A')).toEqual({ kind: 'finished', writtenIds: ['op1'] });
    expect(written).toEqual(['rule op1']);
    expect(finished).toEqual(['clear op1; back to manual op2']);
    // The kept procurement claim wrote nothing; once stale, its resume frees it.
    fake.advanceMinutes(16);
    await orderpoints.resumeOrderRun('run-A');
    expect([...fake.rows.keys()]).toEqual([]);
  });

  it('a mark whose second save fails leaves that chunk unordered, with its typed quantity', async () => {
    const { failOnce, written, finished, orderpoints, orderChunk, startTwoChunks } = setup();
    const taken = await startTwoChunks('run-A');

    await orderChunk('run-A', ['op1']);
    failOnce.matches = (key, data) =>
      key === orderFinishClaimKey('run-A') &&
      Object.entries(data.progress?.steps ?? {}).some(
        ([name, entry]) => name.startsWith('chunk:') && entry.done && (entry.plan as string[]).includes('op2'),
      );
    await expect(orderChunk('run-A', ['op2'])).rejects.toThrow('save failed');

    expect(await orderpoints.settleOrderRun(taken, 'run-A')).toEqual({ kind: 'finished', writtenIds: ['op1'] });
    expect(written).toEqual(['rule op1']);
    expect(finished).toEqual(['clear op1; back to manual op2']);
  });

  it('a resume stopped while settling keeps its decision, and the next resume settles the same way, once', async () => {
    const { fake, failFinishOnce, written, finished, orderpoints, orderChunk, startTwoChunks } = setup();
    const claims = makeClaims(fake.store);

    await startTwoChunks('run-A');
    await orderChunk('run-A', ['op1']);
    await claims.takeClaim(procurementClaimKey('run-A'), 'chunk-2');
    await orderpoints.markOrderChunk('run-A', ['op2'], 'chunk-2');
    fake.advanceMinutes(16);
    // The first resume decides op2 was never written, frees its procurement claim, then stops while settling.
    failFinishOnce.armed = true;
    await expect(orderpoints.resumeOrderRun('run-A')).rejects.toThrow('server stopped');
    expect(finished).toEqual([]);

    // With that claim gone, deciding again would count op2 as written: the stored decision must win.
    fake.advanceMinutes(16);
    await orderpoints.resumeOrderClaim('op1');
    await orderpoints.resumeOrderClaim('op2');

    expect(written).toEqual(['rule op1']);
    expect(finished).toEqual(['clear op1; back to manual op2']);
    expect([...fake.rows.keys()]).toEqual([]);
  });

  it('a last chunk whose claim could not be removed after its writes counts as ordered, and the claim it leaves holds nothing', async () => {
    const { fake, failDestroyOnce, written, finished, orderpoints, orderChunk, startTwoChunks } = setup();
    const taken = await startTwoChunks('run-A');

    await orderChunk('run-A', ['op1']);
    failDestroyOnce.key = procurementClaimKey('run-A');

    expect(await orderChunk('run-A', ['op2'])).toEqual(['rule op2']);
    await orderpoints.completeOrderFinish(
      'run-A',
      { orderpointIds: ['op1', 'op2'], clearTypedIds: ['op1', 'op2'], automaticIds: ['op1', 'op2'] },
      [],
    );
    await orderpoints.releaseOrderpointClaims(taken, 'run-A');

    expect(written).toEqual(['rule op1', 'rule op2']);
    expect(finished).toEqual(['clear op1,op2; back to manual -']);
    expect([...fake.rows.values()].map((row) => [row.key, row.finishedAt !== null])).toEqual([
      [procurementClaimKey('run-A'), true],
    ]);
  });

  it('a click whose claims cannot even be read after its error answers that it is unknown, never an error', async () => {
    const { fake } = setup();
    const claims = makeClaims(fake.store);
    const orderpoints = makeOrderpointClaims({
      claims,
      findClaim: () => Promise.reject(new Error('server busy')),
      resumeProcurementClaim: async () => 'done',
      isProcurementClaimCommitted: async () => false,
      finishOrder: async () => {},
      revertAutomatic: async () => {},
    });

    expect(await orderpoints.settleOrderRun(['op1'], 'run-A')).toEqual({ kind: 'unknown' });
  });

  it('a stale claim of a run with no commit point is released, a live one kept', async () => {
    const { fake, orderpoints } = setup();
    const claims = makeClaims(fake.store);

    await claims.takeClaim('scheduler:orderpoints', 'run-A');
    await orderpoints.releaseStaleClaim('scheduler:orderpoints');
    expect(fake.rows.has('scheduler:orderpoints')).toBe(true);

    fake.advanceMinutes(16);
    await orderpoints.releaseStaleClaim('scheduler:orderpoints');
    expect(fake.rows.has('scheduler:orderpoints')).toBe(false);
  });
});
