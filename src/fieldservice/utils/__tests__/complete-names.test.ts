import { describe, expect, it } from 'vitest';

import { completeDirection, completeName } from 'src/fieldservice/utils/complete-names.util';

describe('completeName', () => {
  it('builds Parent / [REF] Name and bare Name without a parent or ref', () => {
    expect(completeName('Site', 'A1', 'Room')).toBe('Site / [A1] Room');
    expect(completeName(null, null, 'Site')).toBe('Site');
  });
});

describe('completeDirection', () => {
  it('concatenates directions down the chain', () => {
    expect(completeDirection('Gate code 1; Lift', 'Floor 2')).toBe('Gate code 1; Lift; Floor 2');
    expect(completeDirection(null, null)).toBeNull();
  });
});
