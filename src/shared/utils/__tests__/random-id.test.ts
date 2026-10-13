import { describe, expect, it } from 'vitest';

import { randomId } from 'src/shared/utils/random-id.util';

describe('randomId', () => {
  it('makes a version 4 UUID in the RFC 4122 layout', () => {
    expect(randomId()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});
