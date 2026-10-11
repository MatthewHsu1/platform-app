import { describe, expect, it } from 'vitest';

import { batchName } from 'src/stock-picking-batch/utils/batch-name.util';

describe('batchName', () => {
  it('puts the operation type code before the number', () => {
    expect(batchName({ sequenceValue: 'BATCH/00001', typeSequenceCode: 'OUT' })).toEqual({
      name: 'BATCH/OUT/00001',
      misconfigured: false,
    });
  });

  it('splits at the last separator of a longer prefix', () => {
    expect(batchName({ sequenceValue: 'BATCH/test/2026/00001', typeSequenceCode: 'INT' })).toEqual({
      name: 'BATCH/test/2026/INT/00001',
      misconfigured: false,
    });
  });

  it('a prefix without a separator puts the code first and is reported', () => {
    expect(batchName({ sequenceValue: 'BATCH-00001', typeSequenceCode: 'INT' })).toEqual({
      name: 'INT/BATCH-00001',
      misconfigured: true,
    });
  });

  // With no sequence the number is "/", which splits into two empty parts.
  it('without a sequence the name is the code between two separators', () => {
    expect(batchName({ sequenceValue: '', typeSequenceCode: 'INT' })).toEqual({ name: '/INT/', misconfigured: false });
  });
});
