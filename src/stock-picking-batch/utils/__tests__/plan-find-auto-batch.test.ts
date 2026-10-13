import { describe, expect, it } from 'vitest';

import { type AutoBatchPicking } from 'src/stock-picking-batch/types/auto-batch-picking.type';
import { type AutoBatchType } from 'src/stock-picking-batch/types/auto-batch-type.type';
import { type OpenBatch } from 'src/stock-picking-batch/types/open-batch.type';
import { autoBatchDescription, planFindAutoBatch } from 'src/stock-picking-batch/utils/plan-find-auto-batch.util';

const type: AutoBatchType = {
  autoBatch: true,
  batchGroupByPartner: true,
  batchGroupByDestination: false,
  batchGroupBySrcLoc: false,
  batchGroupByDestLoc: false,
  batchMaxLines: 0,
  batchMaxPickings: 0,
  batchAutoConfirm: true,
};
const picking = (id: string, partner: string, values: Partial<AutoBatchPicking> = {}): AutoBatchPicking => ({
  id,
  state: 'ASSIGNED',
  pickingTypeId: 'special-out',
  batchId: null,
  moveCount: 1,
  responsibleUserId: 'me',
  priority: 'NORMAL',
  scheduledDate: '2025-09-02T10:00:00.000Z',
  createdAt: '2025-09-02T10:00:00.000Z',
  partnerKey: partner,
  partnerName: partner === 'p1' ? 'Partner 1' : 'Partner 2',
  countryKey: null,
  countryName: null,
  locationId: 'stock',
  locationName: 'WH/Stock',
  locationDestId: 'customers',
  locationDestName: 'Partners/Customers',
  ...values,
});
const openBatch = (values: Partial<OpenBatch> = {}): OpenBatch => ({
  id: 'b1',
  name: 'BATCH/OUT/00001',
  state: 'IN_PROGRESS',
  isWave: false,
  pickingTypeId: 'special-out',
  moveCount: 1,
  pickings: [picking('t1', 'p1')],
  ...values,
});
const plan = (input: Partial<Parameters<typeof planFindAutoBatch>[0]> & { picking: AutoBatchPicking }) =>
  planFindAutoBatch({ type, openBatches: [], otherPickings: [], batchesToValidate: [], ...input });

describe('planFindAutoBatch: transfers grouped by contact', () => {
  it('pairs a ready transfer with another ready transfer of the same contact in a new confirmed batch', () => {
    expect(plan({ picking: picking('t1', 'p1'), otherPickings: [picking('t2', 'p2'), picking('t3', 'p1')] })).toEqual({
      kind: 'create',
      pickingIds: ['t1', 't3'],
      description: 'Partner 1',
      responsibleId: null,
      confirm: true,
    });
  });

  it('gives a transfer with no match a batch of its own with the transfer responsible', () => {
    expect(plan({ picking: picking('t2', 'p2'), otherPickings: [] })).toEqual({
      kind: 'create',
      pickingIds: ['t2'],
      description: 'Partner 2',
      responsibleId: 'me',
      confirm: true,
    });
  });

  it('joins an open batch that holds a transfer of the same contact, but never a wave or a batch being validated', () => {
    const batch = openBatch({ moveCount: 2 });

    expect(plan({ picking: picking('t4', 'p1'), openBatches: [batch] })).toEqual({ kind: 'join', batchId: 'b1' });
    expect(plan({ picking: picking('t4', 'p1'), openBatches: [{ ...batch, isWave: true }] }).kind).toBe('create');
    expect(plan({ picking: picking('t4', 'p1'), openBatches: [batch], batchesToValidate: ['b1'] }).kind).toBe('create');
  });

  it('joins the open batch with the highest name first', () => {
    expect(
      plan({
        picking: picking('t4', 'p1'),
        openBatches: [openBatch({ id: 'b1', name: 'BATCH/OUT/00001' }), openBatch({ id: 'b2', name: 'BATCH/OUT/00002' })],
      }),
    ).toEqual({ kind: 'join', batchId: 'b2' });
  });

  it('matches a batch when each group value is held by one of its transfers', () => {
    const groupBoth = { ...type, batchGroupBySrcLoc: true };
    const batch = openBatch({
      pickings: [picking('t1', 'p1', { locationId: 'shelf' }), picking('t2', 'p2', { locationId: 'stock' })],
    });

    expect(plan({ picking: picking('t4', 'p1'), type: groupBoth, openBatches: [batch] })).toEqual({ kind: 'join', batchId: 'b1' });
  });

  it('pairs only with a transfer that matches every group value', () => {
    const groupBoth = { ...type, batchGroupBySrcLoc: true };

    expect(
      plan({ picking: picking('t1', 'p1'), type: groupBoth, otherPickings: [picking('t3', 'p1', { locationId: 'shelf' })] }),
    ).toMatchObject({ kind: 'create', pickingIds: ['t1'] });
  });

  it('pairs with the urgent transfer first, then the earliest scheduled one, a transfer with no date last', () => {
    const others = [
      picking('t2', 'p1', { scheduledDate: null }),
      picking('t3', 'p1', { scheduledDate: '2025-09-03T10:00:00.000Z' }),
      picking('t4', 'p1', { scheduledDate: '2025-09-01T10:00:00.000Z' }),
    ];

    expect(plan({ picking: picking('t1', 'p1'), otherPickings: others })).toMatchObject({ pickingIds: ['t1', 't4'] });
    expect(
      plan({ picking: picking('t1', 'p1'), otherPickings: [...others, picking('t5', 'p1', { priority: 'URGENT', scheduledDate: null })] }),
    ).toMatchObject({ pickingIds: ['t1', 't5'] });
    expect(plan({ picking: picking('t1', 'p1'), otherPickings: [others[0]] })).toMatchObject({ pickingIds: ['t1', 't2'] });
  });

  it('pairs with the newest of two transfers scheduled at the same time', () => {
    const others = [
      picking('t2', 'p1', { createdAt: '2025-09-02T09:00:00.000Z' }),
      picking('t3', 'p1', { createdAt: '2025-09-02T11:00:00.000Z' }),
    ];

    expect(plan({ picking: picking('t1', 'p1'), otherPickings: others })).toMatchObject({ pickingIds: ['t1', 't3'] });
  });
});

describe('planFindAutoBatch: transfers left alone', () => {
  it('skips a transfer that is not ready, has a batch or has no moves', () => {
    expect(plan({ picking: picking('t1', 'p1', { state: 'CONFIRMED' }) })).toEqual({ kind: 'skip' });
    expect(plan({ picking: picking('t1', 'p1', { batchId: 'b9' }) })).toEqual({ kind: 'skip' });
    expect(plan({ picking: picking('t1', 'p1', { moveCount: 0 }) })).toEqual({ kind: 'skip' });
  });

  it('skips when the type does not batch or has no batch group-by', () => {
    expect(plan({ picking: picking('t1', 'p1'), type: { ...type, autoBatch: false } })).toEqual({ kind: 'skip' });
    expect(plan({ picking: picking('t1', 'p1'), type: { ...type, batchGroupByPartner: false } })).toEqual({ kind: 'skip' });
  });
});

describe('planFindAutoBatch: limits', () => {
  it('max lines: a transfer bigger than the limit is not batched, a full batch is passed over', () => {
    expect(plan({ picking: picking('t1', 'p1', { moveCount: 3 }), type: { ...type, batchMaxLines: 2 } })).toEqual({ kind: 'skip' });
    const full = openBatch({ moveCount: 2 });
    expect(plan({ picking: picking('t4', 'p1'), type: { ...type, batchMaxLines: 2 }, openBatches: [full] }).kind).toBe('create');
  });

  it('max lines: a pair that would pass the limit is not made', () => {
    expect(
      plan({ picking: picking('t1', 'p1', { moveCount: 2 }), type: { ...type, batchMaxLines: 3 }, otherPickings: [picking('t3', 'p1', { moveCount: 2 })] }),
    ).toMatchObject({ kind: 'create', pickingIds: ['t1'] });
  });

  it('max transfers of 1 never batches; 2 fills a batch up to two', () => {
    expect(plan({ picking: picking('t1', 'p1'), type: { ...type, batchMaxPickings: 1 } })).toEqual({ kind: 'skip' });
    const one = openBatch();
    expect(plan({ picking: picking('t4', 'p1'), type: { ...type, batchMaxPickings: 2 }, openBatches: [one] })).toEqual({ kind: 'join', batchId: 'b1' });
    const two = openBatch({ pickings: [picking('t1', 'p1'), picking('t2', 'p1')] });
    expect(plan({ picking: picking('t4', 'p1'), type: { ...type, batchMaxPickings: 2 }, openBatches: [two] }).kind).toBe('create');
  });

  it('without auto-confirm only draft batches take more transfers, and new batches stay draft', () => {
    const inProgress = openBatch();
    const result = plan({ picking: picking('t4', 'p1'), type: { ...type, batchAutoConfirm: false }, openBatches: [inProgress] });
    expect(result).toMatchObject({ kind: 'create', confirm: false });
    expect(
      plan({ picking: picking('t4', 'p1'), type: { ...type, batchAutoConfirm: false }, openBatches: [openBatch({ state: 'DRAFT' })] }),
    ).toEqual({ kind: 'join', batchId: 'b1' });
  });
});

describe('autoBatchDescription', () => {
  it('joins the active group values', () => {
    expect(
      autoBatchDescription({ ...type, batchGroupBySrcLoc: true, batchGroupByDestLoc: true }, picking('t1', 'p1')),
    ).toBe('Partner 1, WH/Stock, Partners/Customers');
  });

  it('leaves out a group value the transfer does not have', () => {
    expect(
      autoBatchDescription(
        { ...type, batchGroupByDestination: true },
        picking('t1', 'p1', { countryKey: 'Belgium', countryName: 'Belgium' }),
      ),
    ).toBe('Partner 1, Belgium');
    expect(autoBatchDescription({ ...type, batchGroupByDestination: true }, picking('t1', 'p1'))).toBe('Partner 1');
  });
});
