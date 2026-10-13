import { describe, expect, it } from 'vitest';

import { readBatchValidateAnswer } from 'src/stock-picking-batch/utils/batch-validate-answer.util';

describe('readBatchValidateAnswer', () => {
  it('the first click carries no backorder answer, so Validate asks when a backorder is needed', () => {
    expect(readBatchValidateAnswer({ batchIds: ['b1'] })).toEqual({ skipExpired: false });
  });

  it('"No Backorder" makes no backorder and logs the short quantities of every transfer', () => {
    expect(
      readBatchValidateAnswer({ backorderAnswer: { createBackorderIds: [], noBackorderIds: ['p1'], noBackorderButton: true } }),
    ).toEqual({ skipExpired: false, cancelBackorder: true, logEveryTransfer: true });
  });

  it('"Create Backorder" makes the backorders, and a confirmed expired-lot question is kept', () => {
    expect(
      readBatchValidateAnswer({ skipExpired: true, backorderAnswer: { createBackorderIds: ['p1', 'p2'], noBackorderIds: [] } }),
    ).toEqual({ skipExpired: true, cancelBackorder: false });
  });
});
