import { type AreaChain } from 'src/fieldservice/types/area-chain.type';
import { type AreaLookups } from 'src/fieldservice/types/area-lookups.type';
import { planTerritoryChain } from 'src/fieldservice/utils/plan-territory-chain.util';
import { sameValue } from 'src/shared/utils/same-value.util';

type AreaWritten = { location: boolean; territory: boolean; branch: boolean; district: boolean; region: boolean };

const parentOf = (lookup: ReadonlyMap<string, string | null>, id: string | null) => (id === null ? null : (lookup.get(id) ?? null));

// A changed level fills the levels below it from the area tree: a new location brings its territory, a territory
// its branch, district and region, a branch its district and region, a district its region. A level written in
// the same save stays, and the levels below it follow it. Only the levels that change are returned.
export const planAreaCascade = ({
  current,
  written,
  locationTerritoryId,
  lookups,
}: {
  current: AreaChain;
  written: AreaWritten;
  locationTerritoryId: string | null;
  lookups: AreaLookups;
}): Partial<AreaChain> => {
  const next: AreaChain = { ...current };
  const territoryTouched = written.territory || written.location;

  if (written.location && !written.territory) {
    next.territoryId = locationTerritoryId;
  }
  if (territoryTouched) {
    const branchId = parentOf(lookups.branchOfTerritory, next.territoryId);
    const districtId = parentOf(lookups.districtOfBranch, branchId);
    const chain = planTerritoryChain(
      next.territoryId === null ? null : { branchId, districtId, regionId: parentOf(lookups.regionOfDistrict, districtId) },
    );

    if (!written.branch) {
      next.branchId = chain.branchId;
    }
  }
  const branchTouched = territoryTouched || written.branch;

  if (branchTouched && !written.district) {
    next.districtId = parentOf(lookups.districtOfBranch, next.branchId);
  }
  if ((branchTouched || written.district) && !written.region) {
    next.regionId = parentOf(lookups.regionOfDistrict, next.districtId);
  }

  return Object.fromEntries(
    (Object.keys(next) as (keyof AreaChain)[]).filter((level) => !sameValue(next[level], current[level])).map((level) => [level, next[level]]),
  );
};
