import { describe, expect, it } from 'vitest';

import { locations } from 'src/stock/utils/procurement/__tests__/routing-fixture';
import { isRoutingLocationUnder, locationChain } from 'src/stock/utils/procurement/location-chain.util';

describe('isRoutingLocationUnder', () => {
  const locationMap = locations({
    wh: { name: 'WH', usage: 'VIEW', warehouseId: 'WH' },
    stock: { name: 'Stock', parentId: 'wh' },
  });
  const stock = locationMap.get('stock');
  const wh = locationMap.get('wh');
  const unbuilt = stock === undefined ? undefined : { ...stock, id: 'unbuilt', parentPath: '' };

  it('puts a location under its parent', () => {
    expect(isRoutingLocationUnder(stock, wh)).toBe(true);
  });

  it('treats a location whose path is not built yet as outside the tree', () => {
    expect(isRoutingLocationUnder(unbuilt, wh)).toBe(false);
    expect(isRoutingLocationUnder(stock, unbuilt)).toBe(false);
  });
});

describe('locationChain', () => {
  it('is empty for no location', () => {
    expect(locationChain(null, locations({}))).toEqual([]);
  });
});
