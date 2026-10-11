import { describe, expect, it } from 'vitest';

import { type MergeBatch } from 'src/stock-picking-batch/types/merge-batch.type';
import {
  mergeIncompatibilities,
  planBatchCancel,
  planBatchCheckAvailability,
  planBatchConfirm,
  planBatchMerge,
} from 'src/stock-picking-batch/utils/plan-batch-buttons.util';

const batch = (id: string, values: Partial<MergeBatch> = {}): MergeBatch => ({
  id,
  state: 'IN_PROGRESS',
  isWave: false,
  pickingTypeId: 'out',
  scheduledDate: '2025-09-02T10:00:00.000Z',
  responsibleId: 'me',
  description: null,
  ...values,
});

describe('planBatchMerge', () => {
  it('refuses one batch, mixed states, types, kinds and closed batches', () => {
    expect(planBatchMerge([batch('b1')])).toEqual({ kind: 'refuse', message: 'mergeFew' });
    expect(planBatchMerge([batch('b1'), batch('b2', { state: 'DRAFT' })])).toEqual({ kind: 'refuse', message: 'mergeStates' });
    expect(planBatchMerge([batch('b1'), batch('b2', { pickingTypeId: 'in' })])).toEqual({ kind: 'refuse', message: 'mergeTypes' });
    expect(planBatchMerge([batch('b1'), batch('b2', { isWave: true })])).toEqual({ kind: 'refuse', message: 'mergeKinds' });
    expect(planBatchMerge([batch('b1', { state: 'DONE' }), batch('b2', { state: 'DONE' })])).toEqual({ kind: 'refuse', message: 'mergeClosed' });
  });

  it('merges into the first; the earliest dated batch gives responsible, description and date', () => {
    expect(
      planBatchMerge([
        batch('b1', { description: 'Great batch' }),
        batch('b2', { description: 'Amazing batch', scheduledDate: '2025-09-01T10:00:00.000Z' }),
        batch('b3', { description: 'Without scheduled date batch', scheduledDate: null }),
      ]),
    ).toEqual({
      kind: 'merge',
      targetId: 'b1',
      otherIds: ['b2', 'b3'],
      values: { responsibleId: 'me', description: 'Amazing batch', scheduledDate: '2025-09-01T10:00:00.000Z' },
    });
  });

  it('a batch without an operation type does not count as a different type', () => {
    expect(planBatchMerge([batch('b1', { pickingTypeId: null }), batch('b2')])).toMatchObject({ kind: 'merge', targetId: 'b1' });
  });
});

describe('mergeIncompatibilities', () => {
  const picking = (id: string, state: string, pickingTypeId: string | null = 'out') => ({ id, name: id, state, pickingTypeId });

  it('names the transfers the target may not hold once merged', () => {
    expect(
      mergeIncompatibilities({
        target: { name: 'BATCH/OUT/00001', state: 'IN_PROGRESS', pickingTypeId: 'out' },
        own: [picking('OUT/1', 'ASSIGNED')],
        moved: [picking('OUT/2', 'CONFIRMED'), picking('OUT/3', 'DONE')],
      }),
    ).toEqual(['OUT/3']);
  });

  it('a target without a type takes the type of the first transfer it gets', () => {
    expect(
      mergeIncompatibilities({
        target: { name: 'New', state: 'DRAFT', pickingTypeId: null },
        own: [],
        moved: [picking('OUT/1', 'DRAFT'), picking('IN/1', 'DRAFT', 'in')],
      }),
    ).toEqual(['IN/1']);
  });
});

describe('the other batch buttons re-check their condition', () => {
  it('Confirm: a draft batch with transfers', () => {
    expect(planBatchConfirm({ state: 'DRAFT', pickingCount: 2 })).toBeNull();
    expect(planBatchConfirm({ state: 'DRAFT', pickingCount: 0 })).toBe('noPickings');
    expect(planBatchConfirm({ state: 'IN_PROGRESS', pickingCount: 2 })).toBe('notDraft');
  });

  it('Check Availability: a draft or in-progress batch with a move not yet ready', () => {
    expect(planBatchCheckAvailability({ state: 'IN_PROGRESS', moveStates: ['ASSIGNED', 'CONFIRMED'] })).toBeNull();
    expect(planBatchCheckAvailability({ state: 'IN_PROGRESS', moveStates: ['ASSIGNED', 'DONE'] })).toBe('nothingToCheck');
    expect(planBatchCheckAvailability({ state: 'DONE', moveStates: ['CONFIRMED'] })).toBe('nothingToCheck');
  });

  it('Cancel: an in-progress batch', () => {
    expect(planBatchCancel({ state: 'IN_PROGRESS' })).toBeNull();
    expect(planBatchCancel({ state: 'DRAFT' })).toBe('notInProgress');
  });
});
