import { describe, expect, it } from 'vitest';

import { forEachReportingErrors, retryOnConflict } from 'src/shared/triggers/retry-on-conflict';

const NO_WAIT = { waitStepMs: 0 };

describe('retryOnConflict', () => {
  it('runs again after a unique index refusal from a parallel run', async () => {
    let calls = 0;
    const result = await retryOnConflict(async () => {
      calls += 1;
      if (calls === 1) {
        throw new Error(
          'Create productProducts: A duplicate entry was detected: unique constraint _productProduct.IDX_UNIQUE_91a05a8efeaecc1023e576cf34d was violated',
        );
      }
      return 'done';
    }, NO_WAIT);

    expect({ result, calls }).toEqual({ result: 'done', calls: 2 });
  });

  it('runs again after Postgres picks it as the deadlock victim', async () => {
    let calls = 0;
    await retryOnConflict(async () => {
      calls += 1;
      if (calls === 1) {
        throw new Error('Update productTemplateAttributeValues: deadlock detected');
      }
    }, NO_WAIT);

    expect(calls).toBe(2);
  });

  it('gives up after five tries and passes other errors straight on', async () => {
    let calls = 0;
    await expect(
      retryOnConflict(async () => {
        calls += 1;
        throw new Error('Delete productProduct v1: Record not found');
      }, NO_WAIT),
    ).rejects.toThrow('Record not found');
    expect(calls).toBe(5);

    await expect(
      retryOnConflict(async () => {
        throw new Error('Forbidden');
      }, NO_WAIT),
    ).rejects.toThrow('Forbidden');
  });
});

describe('forEachReportingErrors', () => {
  it('finishes the other products, then reports the one that failed', async () => {
    const done: string[] = [];

    await expect(
      forEachReportingErrors(['shirt', 'mug', 'cap'], async (product) => {
        if (product === 'mug') {
          throw new Error('Forbidden');
        }
        done.push(product);
      }),
    ).rejects.toThrow('1 of 3 failed. mug: Forbidden');
    expect(done).toEqual(['shirt', 'cap']);
  });
});
