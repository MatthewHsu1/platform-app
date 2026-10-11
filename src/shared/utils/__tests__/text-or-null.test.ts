import { describe, expect, it } from 'vitest';

import { textOrNull } from 'src/shared/utils/text-or-null.util';

// Twenty's API answers "" for a TEXT field whose column is NULL (seen live on stockMove.procurementRun).
describe('textOrNull', () => {
  it('reads an empty text field as no value', () => {
    expect(textOrNull('')).toBeNull();
    expect(textOrNull(null)).toBeNull();
    expect(textOrNull(undefined)).toBeNull();
  });

  it('keeps a filled text field', () => {
    expect(textOrNull('WH/IN/00001')).toBe('WH/IN/00001');
  });
});
