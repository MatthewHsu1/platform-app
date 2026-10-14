import { resBranches, resDistricts, resTerritories } from 'src/fieldservice/fieldservice-records';
import { type AreaLookups } from 'src/fieldservice/types/area-lookups.type';
import { findMany } from 'src/shared/triggers/records';

// The whole service area tree, read once per batch: staff keep it small.
export const loadAreaLookups = async (): Promise<AreaLookups> => {
  const found = await findMany<{
    territories: { id: string; branchId: string | null }[];
    branches: { id: string; districtId: string | null }[];
    districts: { id: string; regionId: string | null }[];
  }>({
    territories: { of: resTerritories, filter: {}, selection: 'id branchId' },
    branches: { of: resBranches, filter: {}, selection: 'id districtId' },
    districts: { of: resDistricts, filter: {}, selection: 'id regionId' },
  });

  return {
    branchOfTerritory: new Map(found.territories.map((row) => [row.id, row.branchId])),
    districtOfBranch: new Map(found.branches.map((row) => [row.id, row.districtId])),
    regionOfDistrict: new Map(found.districts.map((row) => [row.id, row.regionId])),
  };
};
