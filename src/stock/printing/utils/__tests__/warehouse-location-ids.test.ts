import { describe, expect, it } from 'vitest';

import { warehouseLocationIds } from 'src/stock/printing/utils/warehouse-location-ids.util';

describe('warehouseLocationIds', () => {
  it('takes every location under the view of each warehouse, the views too, but no vendor location', () => {
    const locations = [
      { id: 'wh1', parentPath: '/1/', usage: 'VIEW' },
      { id: 'wh1-stock', parentPath: '/1/2/', usage: 'INTERNAL' },
      { id: 'wh1-vendor', parentPath: '/1/3/', usage: 'SUPPLIER' },
      { id: 'wh2', parentPath: '/9/', usage: 'VIEW' },
      { id: 'wh2-stock', parentPath: '/9/10/', usage: 'INTERNAL' },
      { id: 'other', parentPath: '/10/', usage: 'INTERNAL' },
      { id: 'no-path', parentPath: null, usage: 'INTERNAL' },
    ];

    expect([...warehouseLocationIds(['/1/', '/9/'], locations)].sort()).toEqual(['wh1', 'wh1-stock', 'wh2', 'wh2-stock']);
  });
});
