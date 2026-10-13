import { describe, expect, it } from 'vitest';

import { planAddToBatch } from 'src/stock-picking-batch/utils/plan-add-to-batch.util';

const ready = (id: string, pickingTypeId = 'out') => ({ id, name: id, state: 'ASSIGNED', pickingTypeId });
const base = { responsibleId: 'me', description: 'Morning round', isCreateDraft: false };
const openBatch = { id: 'b1', name: 'BATCH/OUT/00001', state: 'IN_PROGRESS' as const, pickingTypeId: 'out', isWave: false };

describe('planAddToBatch', () => {
  it('a new batch takes the responsible, the first transfer type and the description, and is confirmed', () => {
    expect(planAddToBatch({ ...base, mode: 'NEW', batch: null, pickings: [ready('t1'), ready('t2')] })).toEqual({
      kind: 'create',
      values: { pickingTypeId: 'out', responsibleId: 'me', description: 'Morning round', isWave: false },
      confirm: true,
    });
  });

  it('Draft keeps the new batch in draft', () => {
    expect(planAddToBatch({ ...base, isCreateDraft: true, mode: 'NEW', batch: null, pickings: [ready('t1')] })).toMatchObject({
      kind: 'create',
      confirm: false,
    });
  });

  it('a new batch is a draft, so draft transfers may join it', () => {
    expect(
      planAddToBatch({ ...base, mode: 'NEW', batch: null, pickings: [{ ...ready('t1'), state: 'DRAFT' }] }),
    ).toMatchObject({ kind: 'create', confirm: true });
  });

  it('refuses transfers of two types for a new batch, naming the misfit', () => {
    expect(planAddToBatch({ ...base, mode: 'NEW', batch: null, pickings: [ready('t1'), ready('t2', 'in')] })).toEqual({
      kind: 'refuse',
      message: 'incompatible',
      batchName: 'New',
      transfers: ['t2'],
    });
  });

  it('refuses done and cancelled transfers for a new batch', () => {
    expect(
      planAddToBatch({
        ...base,
        mode: 'NEW',
        batch: null,
        pickings: [ready('t1'), { ...ready('t2'), state: 'DONE' }, { ...ready('t3'), state: 'CANCEL' }],
      }),
    ).toEqual({ kind: 'refuse', message: 'incompatible', batchName: 'New', transfers: ['t2', 't3'] });
  });

  it('an existing batch must be chosen and must accept the transfers', () => {
    expect(planAddToBatch({ ...base, mode: 'EXISTING', batch: null, pickings: [ready('t1')] })).toEqual({
      kind: 'refuse',
      message: 'chooseBatch',
    });
    expect(planAddToBatch({ ...base, mode: 'EXISTING', batch: openBatch, pickings: [ready('t1')] })).toEqual({
      kind: 'join',
      batchId: 'b1',
    });
    expect(
      planAddToBatch({ ...base, mode: 'EXISTING', batch: openBatch, pickings: [{ ...ready('t9'), state: 'DRAFT' }] }),
    ).toEqual({
      kind: 'refuse',
      message: 'incompatible',
      batchName: 'BATCH/OUT/00001',
      transfers: ['t9'],
    });
  });

  it('a draft batch takes draft transfers', () => {
    expect(
      planAddToBatch({
        ...base,
        mode: 'EXISTING',
        batch: { ...openBatch, state: 'DRAFT' },
        pickings: [{ ...ready('t1'), state: 'DRAFT' }],
      }),
    ).toEqual({ kind: 'join', batchId: 'b1' });
  });

  it('an existing batch refuses transfers of another type', () => {
    expect(planAddToBatch({ ...base, mode: 'EXISTING', batch: openBatch, pickings: [ready('t1', 'in')] })).toEqual({
      kind: 'refuse',
      message: 'incompatible',
      batchName: 'BATCH/OUT/00001',
      transfers: ['t1'],
    });
  });

  it('an existing batch with no type takes the first transfer type, so a second type is refused', () => {
    const untyped = { ...openBatch, name: 'New', state: 'DRAFT' as const, pickingTypeId: null };

    expect(planAddToBatch({ ...base, mode: 'EXISTING', batch: untyped, pickings: [ready('t1', 'in'), ready('t2')] })).toEqual({
      kind: 'refuse',
      message: 'incompatible',
      batchName: 'New',
      transfers: ['t2'],
    });
    expect(planAddToBatch({ ...base, mode: 'EXISTING', batch: untyped, pickings: [ready('t1', 'in')] })).toEqual({
      kind: 'join',
      batchId: 'b1',
    });
  });

  it('only an open batch transfer can be chosen, never a wave or a closed batch', () => {
    for (const batch of [
      { ...openBatch, isWave: true },
      { ...openBatch, state: 'DONE' as const },
      { ...openBatch, state: 'CANCEL' as const },
    ]) {
      expect(planAddToBatch({ ...base, mode: 'EXISTING', batch, pickings: [ready('t1')] })).toEqual({
        kind: 'refuse',
        message: 'chooseBatch',
      });
    }
  });
});
