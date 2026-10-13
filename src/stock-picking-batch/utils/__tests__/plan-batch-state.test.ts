import { describe, expect, it } from 'vitest';

import {
  planBatchCounts,
  planBatchScheduledDate,
  planBatchState,
} from 'src/stock-picking-batch/utils/plan-batch-state.util';

describe('planBatchState', () => {
  it('a batch whose transfers are all cancelled is cancelled', () => {
    expect(planBatchState({ state: 'IN_PROGRESS', pickingStates: ['CANCEL', 'CANCEL'] })).toBe('CANCEL');
  });

  it('a batch whose transfers are all done or cancelled is done', () => {
    expect(planBatchState({ state: 'IN_PROGRESS', pickingStates: ['DONE', 'CANCEL'] })).toBe('DONE');
  });

  it('an open transfer keeps the state; a done, cancelled or empty batch never changes', () => {
    expect(planBatchState({ state: 'IN_PROGRESS', pickingStates: ['DONE', 'ASSIGNED'] })).toBe('IN_PROGRESS');
    expect(planBatchState({ state: 'DONE', pickingStates: ['CANCEL'] })).toBe('DONE');
    expect(planBatchState({ state: 'CANCEL', pickingStates: ['DONE'] })).toBe('CANCEL');
    expect(planBatchState({ state: 'DRAFT', pickingStates: [] })).toBe('DRAFT');
  });
});

describe('planBatchScheduledDate', () => {
  it('is the earliest date of its transfers', () => {
    expect(planBatchScheduledDate(['2025-09-05T10:00:00.000Z', '2025-09-04T10:00:00.000Z', null])).toBe(
      '2025-09-04T10:00:00.000Z',
    );
  });

  it('is empty once the batch has no transfers', () => {
    expect(planBatchScheduledDate([])).toBeNull();
  });
});

describe('planBatchCounts', () => {
  it('counts the open batches and waves of each operation type', () => {
    expect(
      planBatchCounts([
        { pickingTypeId: 'out', isWave: false, state: 'DRAFT' },
        { pickingTypeId: 'out', isWave: false, state: 'IN_PROGRESS' },
        { pickingTypeId: 'out', isWave: true, state: 'IN_PROGRESS' },
        { pickingTypeId: 'out', isWave: false, state: 'DONE' },
        { pickingTypeId: 'in', isWave: false, state: 'CANCEL' },
      ]),
    ).toEqual(
      new Map([
        ['out', { countPickingBatch: 2, countPickingWave: 1 }],
        ['in', { countPickingBatch: 0, countPickingWave: 0 }],
      ]),
    );
  });
});
