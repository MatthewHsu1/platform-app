import { describe, expect, it } from 'vitest';

import { uuidFromBytes } from 'src/shared/utils/uuid-from-bytes.util';

describe('uuidFromBytes', () => {
  it('sets the version nibble and the variant bits of the RFC 4122 layout', () => {
    expect(uuidFromBytes(new Uint8Array(16), 5)).toBe('00000000-0000-5000-8000-000000000000');
    expect(uuidFromBytes(new Uint8Array(20).fill(0xff), 4)).toBe('ffffffff-ffff-4fff-bfff-ffffffffffff');
  });
});
