import { describe, expect, it } from 'vitest';

import { formatSequenceNumber } from 'src/base/sequence/next-number';

describe('case numbers', () => {
  it('prints HT and five digits, and does not cut a longer number', () => {
    expect(formatSequenceNumber('HT', 5, 1)).toBe('HT00001');
    expect(formatSequenceNumber('HT', 5, 42)).toBe('HT00042');
    expect(formatSequenceNumber('HT', 5, 123456)).toBe('HT123456');
  });
});
