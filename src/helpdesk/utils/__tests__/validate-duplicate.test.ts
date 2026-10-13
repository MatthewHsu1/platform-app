import { describe, expect, it } from 'vitest';

import { validateDuplicate } from 'src/helpdesk/utils/validate-duplicate.util';

describe('validateDuplicate', () => {
  it('accepts another case that is not a duplicate itself', () => {
    expect(validateDuplicate({ caseId: 'a', original: { id: 'b', duplicateId: null } })).toBeNull();
  });

  it('refuses a missing original, the case itself, and an original that is a duplicate', () => {
    const refusal = 'Choose a valid original case.';

    expect(validateDuplicate({ caseId: 'a', original: null })).toBe(refusal);
    expect(validateDuplicate({ caseId: 'a', original: { id: 'a', duplicateId: null } })).toBe(refusal);
    expect(validateDuplicate({ caseId: 'a', original: { id: 'b', duplicateId: 'c' } })).toBe(refusal);
  });
});
