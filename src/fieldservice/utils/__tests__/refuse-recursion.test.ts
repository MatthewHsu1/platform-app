import { describe, expect, it } from 'vitest';

import { refuseRecursion } from 'src/fieldservice/utils/refuse-recursion.util';

describe('refuseRecursion', () => {
  it('refuses self-parenting and ancestor cycles, allows anything else', () => {
    expect(refuseRecursion('a', ['a'])).toBe(true);
    expect(refuseRecursion('a', ['b', 'a'])).toBe(true);
    expect(refuseRecursion('a', ['b', null])).toBe(false);
  });
});
