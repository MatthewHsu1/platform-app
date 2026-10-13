import { describe, expect, it } from 'vitest';

import { isUuid } from 'src/shared/utils/is-uuid.util';

describe('isUuid', () => {
  it('takes the 8-4-4-4-12 hexadecimal form in either case', () => {
    expect(isUuid('f81d4fae-7dec-11d0-a765-00a0c91e6bf6')).toBe(true);
    expect(isUuid('F81D4FAE-7DEC-11D0-A765-00A0C91E6BF6')).toBe(true);
  });

  it('refuses anything else', () => {
    expect(isUuid('f81d4fae7dec11d0a76500a0c91e6bf6')).toBe(false);
    expect(isUuid('f81d4fae-7dec-11d0-a765-00a0c91e6bf6 ')).toBe(false);
    expect(isUuid(42)).toBe(false);
  });
});
