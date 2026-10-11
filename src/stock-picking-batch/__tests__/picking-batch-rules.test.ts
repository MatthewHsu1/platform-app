import { type ObjectRecordEvent } from 'twenty-sdk/define';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { errorCollector } from 'src/shared/triggers/retry-on-conflict';
import { assignBatchResponsible } from 'src/stock-picking-batch/assign-batch-responsible';
import { handlePickingBatchRules } from 'src/stock-picking-batch/picking-batch-rules';
import { waitForBatchNumber } from 'src/stock-picking-batch/read-batch-name';
import { type PickingEventRecord } from 'src/stock/picking/types/picking-event-record.type';

const batch = { id: 'b1', name: 'New', state: 'IN_PROGRESS', isWave: false, pickingTypeId: 'out', responsibleId: 'batch-user' };
const transfer = { id: 't1', name: 'WH/OUT/00001', state: 'ASSIGNED', pickingTypeId: 'out', batchId: 'b1' };

vi.mock('src/stock-picking-batch/stock-picking-batch-records', () => ({
  stockPickingBatches: { find: vi.fn(async () => [batch]), update: vi.fn(), updateMany: vi.fn() },
  stockPickings: {
    find: vi.fn(async (filter: { id?: unknown; batchId?: unknown }) => ('id' in filter || 'batchId' in filter ? [transfer] : [])),
    updateMany: vi.fn(),
  },
}));
vi.mock('src/shared/i18n/read-user-locale', () => ({ readMemberLocale: vi.fn(async () => 'en') }));
vi.mock('src/stock-picking-batch/assign-batch-responsible', () => ({ assignBatchResponsible: vi.fn(async () => {}) }));
vi.mock('src/stock-picking-batch/read-batch-name', () => ({ waitForBatchNumber: vi.fn() }));
vi.mock('src/stock-picking-batch/number-batch', () => ({ numberBatch: vi.fn() }));
vi.mock('src/stock-picking-batch/find-auto-batch', () => ({ findAutoBatch: vi.fn(async () => {}) }));
vi.mock('src/stock-picking-batch/recompute-batch-state', () => ({ recomputeBatchState: vi.fn(async () => {}) }));
vi.mock('src/stock-picking-batch/validating-batches', () => ({ validatingBatchIds: vi.fn(async () => []) }));
vi.mock('src/stock/stock-put-back', () => ({ putBackForEvent: vi.fn(async () => {}) }));

const JOIN_SAVE = '2026-10-10T10:00:05.000Z';

// A staff save that moves the transfer into batch b1.
const staffJoin = {
  recordId: 't1',
  workspaceMemberId: 'member-1',
  properties: {
    before: { ...transfer, batchId: null, updatedAt: '2026-10-10T09:00:00.000Z', updatedBy: { source: 'MANUAL' } },
    after: { ...transfer, updatedAt: JOIN_SAVE, updatedBy: { source: 'MANUAL' } },
  },
} as unknown as ObjectRecordEvent<PickingEventRecord>;

describe('a transfer moved into a typed batch still named "New"', () => {
  beforeEach(() => {
    vi.mocked(assignBatchResponsible).mockClear();
  });

  it('gets the batch responsible, named "New", when staff named the batch so and no number comes', async () => {
    vi.mocked(waitForBatchNumber).mockResolvedValue({ name: 'New', numbered: false });

    await handlePickingBatchRules([staffJoin], 'updated', errorCollector());

    expect(vi.mocked(assignBatchResponsible).mock.calls).toEqual([
      [{ id: 'b1', name: 'New', responsibleId: 'batch-user' }, { saveKey: JOIN_SAVE, locale: 'en', createdBefore: JOIN_SAVE }],
    ]);
  });

  it('gets the batch responsible under the number once it comes, with its move as the cut-off', async () => {
    vi.mocked(waitForBatchNumber).mockResolvedValue({ name: 'BATCH/OUT/00003', numbered: true });

    await handlePickingBatchRules([staffJoin], 'updated', errorCollector());

    expect(vi.mocked(assignBatchResponsible).mock.calls).toEqual([
      [{ id: 'b1', name: 'BATCH/OUT/00003', responsibleId: 'batch-user' }, { saveKey: JOIN_SAVE, locale: 'en', createdBefore: JOIN_SAVE }],
    ]);
  });
});
