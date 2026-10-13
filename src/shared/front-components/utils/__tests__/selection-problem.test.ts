import { describe, expect, it } from 'vitest';

import { findSelectionProblem } from 'src/shared/front-components/utils/selection-problem.util';

describe('findSelectionProblem', () => {
  it('says none when nothing is ticked, for either kind of button', () => {
    expect(findSelectionProblem(0, 'many')).toBe('none');
    expect(findSelectionProblem(0, 'one')).toBe('none');
  });

  it('accepts one record for either kind of button', () => {
    expect(findSelectionProblem(1, 'many')).toBeNull();
    expect(findSelectionProblem(1, 'one')).toBeNull();
  });

  it('accepts many records for a button that takes many', () => {
    expect(findSelectionProblem(2, 'many')).toBeNull();
    expect(findSelectionProblem(3000, 'many')).toBeNull();
  });

  it('refuses many records for a button that takes one', () => {
    expect(findSelectionProblem(2, 'one')).toBe('tooMany');
    expect(findSelectionProblem(3000, 'one')).toBe('tooMany');
  });
});
