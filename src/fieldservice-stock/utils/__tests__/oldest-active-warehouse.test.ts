import { describe, expect, it } from 'vitest';

import { oldestActiveWarehouse } from 'src/fieldservice-stock/utils/oldest-active-warehouse.util';

describe('oldestActiveWarehouse', () => {
  it('takes the oldest warehouse that is not archived', () => {
    expect(
      oldestActiveWarehouse([
        { id: 'late', active: true, createdAt: '2026-03-01T00:00:00.000Z' },
        { id: 'archived', active: false, createdAt: '2026-01-01T00:00:00.000Z' },
        { id: 'first', active: null, createdAt: '2026-02-01T00:00:00.000Z' },
      ]),
    ).toBe('first');
  });

  it('answers nothing when every warehouse is archived or there is none', () => {
    expect(oldestActiveWarehouse([{ id: 'archived', active: false, createdAt: '2026-01-01T00:00:00.000Z' }])).toBeNull();
    expect(oldestActiveWarehouse([])).toBeNull();
  });
});
