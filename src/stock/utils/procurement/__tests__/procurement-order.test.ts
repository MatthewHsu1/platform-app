import { describe, expect, it } from 'vitest';

import { orderByCreation } from 'src/stock/utils/procurement/order-by-creation.util';

describe('orderByCreation', () => {
  it('puts the reference made first in front, whatever order the links were read in', () => {
    expect(
      orderByCreation(['late', 'early', 'tie-b', 'tie-a'], [
        { id: 'late', createdAt: '2026-10-09T10:00:00.000Z' },
        { id: 'early', createdAt: '2026-10-08T10:00:00.000Z' },
        { id: 'tie-b', createdAt: '2026-10-09T12:00:00.000Z' },
        { id: 'tie-a', createdAt: '2026-10-09T12:00:00.000Z' },
      ]),
    ).toEqual(['early', 'late', 'tie-a', 'tie-b']);
  });
});
