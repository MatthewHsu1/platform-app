import { type TerritoryChain } from 'src/fieldservice/types/territory-chain.type';

type TerritorySource = Pick<TerritoryChain, 'branchId' | 'districtId' | 'regionId'>;

// The equipment territory chain mirrors the linked territory. Clearing the
// territory clears the chain; otherwise each level is copied through.
export const planTerritoryChain = (territory: TerritorySource | null): TerritorySource => {
  if (territory === null) {
    return { branchId: null, districtId: null, regionId: null };
  }
  return { branchId: territory.branchId, districtId: territory.districtId, regionId: territory.regionId };
};
