import { describe, expect, it } from 'vitest';

import { isFieldSet } from 'src/fieldservice-stage-validation/utils/is-field-set.util';

describe('isFieldSet', () => {
  it.each([null, undefined, '', 0, false, [], { markdown: null, blocknote: null }, { markdown: '' }])('reads %j as empty', (value) => {
    expect(isFieldSet(value)).toBe(false);
  });

  it.each(['a', 3, 0.5, true, ['x'], { markdown: 'Replaced the belt', blocknote: null }, '2026-10-14T08:00:00.000Z'])('reads %j as set', (value) => {
    expect(isFieldSet(value)).toBe(true);
  });
});
