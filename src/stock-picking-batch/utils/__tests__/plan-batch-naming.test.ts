import { describe, expect, it } from 'vitest';

import { shouldNameBatch } from 'src/stock-picking-batch/utils/plan-batch-naming.util';

const save = {
  created: false,
  staffChange: true,
  pickingTypeId: 'int',
  pickingTypeIdBefore: null,
  name: 'New',
  nameBefore: 'New',
};

describe('shouldNameBatch', () => {
  it('a batch created with an operation type gets a number', () => {
    expect(shouldNameBatch({ ...save, created: true })).toBe(true);
  });

  it('a batch created without an operation type stays "New"', () => {
    expect(shouldNameBatch({ ...save, created: true, pickingTypeId: null })).toBe(false);
  });

  it('a batch created with its own name keeps it', () => {
    expect(shouldNameBatch({ ...save, created: true, name: 'Batch 1', nameBefore: null })).toBe(false);
  });

  it('a batch given an operation type later gets a number', () => {
    expect(shouldNameBatch(save)).toBe(true);
  });

  it('a batch whose operation type staff change is renamed, also when it had its own name', () => {
    expect(shouldNameBatch({ ...save, pickingTypeIdBefore: 'out', name: 'Batch 1', nameBefore: 'Batch 1' })).toBe(true);
  });

  it('a batch typed by the app from its first transfer gets a number', () => {
    expect(shouldNameBatch({ ...save, staffChange: false })).toBe(true);
  });

  it('a refused operation type written back by the app keeps the name', () => {
    expect(shouldNameBatch({ ...save, staffChange: false, pickingTypeIdBefore: 'out', name: 'BATCH/INT/00001', nameBefore: 'BATCH/INT/00001' })).toBe(false);
  });

  it('a cleared operation type keeps the name', () => {
    expect(shouldNameBatch({ ...save, pickingTypeId: null, pickingTypeIdBefore: 'out', name: 'BATCH/OUT/00001', nameBefore: 'BATCH/OUT/00001' })).toBe(false);
  });

  it('a save already renamed by an earlier run is not numbered again', () => {
    expect(shouldNameBatch({ ...save, name: 'BATCH/INT/00001', nameBefore: 'New' })).toBe(false);
  });
});
