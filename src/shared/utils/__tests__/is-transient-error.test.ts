import { describe, expect, it } from 'vitest';

import { isTransientError } from 'src/shared/utils/is-transient-error.util';

describe('isTransientError', () => {
  it("takes Twenty's clash, missing-row and deadlock answers as passing", () => {
    expect(isTransientError(new Error('Update stockWarehouseOrderpoint 1: A duplicate entry was detected'))).toBe(true);
    expect(isTransientError(new Error('Update stockWarehouseOrderpoint 1: Record not found'))).toBe(true);
    expect(isTransientError(new Error('Update stockWarehouseOrderpoints: deadlock detected'))).toBe(true);
  });

  it("takes Twenty's rate limit and a dropped connection as passing", () => {
    expect(isTransientError(new Error("Twenty's rate limit for apps was still exceeded after 24 tries 5 s apart: Rate limit exceeded"))).toBe(true);
    expect(isTransientError(new TypeError('fetch failed'))).toBe(true);
  });

  it('takes any other error as lasting', () => {
    expect(isTransientError(new Error('Find stockWarehouseOrderpoints: Cannot query field "x"'))).toBe(false);
    expect(isTransientError('boom')).toBe(false);
  });
});
