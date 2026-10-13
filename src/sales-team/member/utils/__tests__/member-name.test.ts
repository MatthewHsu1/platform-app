import { describe, expect, it } from 'vitest';

import { memberName } from 'src/sales-team/member/utils/member-name.util';

describe('memberName', () => {
  it('joins first and last name', () => {
    expect(memberName({ firstName: 'Ann', lastName: 'Lee' })).toBe('Ann Lee');
  });

  it('uses the part that is there', () => {
    expect(memberName({ firstName: '', lastName: 'Lee' })).toBe('Lee');
    expect(memberName({ firstName: 'Ann', lastName: null })).toBe('Ann');
  });

  it('is empty when the salesperson has no name', () => {
    expect(memberName(null)).toBeNull();
    expect(memberName({ firstName: ' ', lastName: '' })).toBeNull();
  });
});
