import { describe, expect, it } from 'vitest';

import { planTerritoryChain } from 'src/fieldservice/utils/plan-territory-chain.util';

describe('planTerritoryChain', () => {
  it('copies the chain and clears it when the territory is removed', () => {
    expect(planTerritoryChain({ branchId: 'b', districtId: 'd', regionId: 'r' })).toEqual({ branchId: 'b', districtId: 'd', regionId: 'r' });
    expect(planTerritoryChain(null)).toEqual({ branchId: null, districtId: null, regionId: null });
  });
});
