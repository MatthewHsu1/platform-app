// The parent of each service area level: a territory's branch, a branch's district, a district's region.
export type AreaLookups = {
  branchOfTerritory: ReadonlyMap<string, string | null>;
  districtOfBranch: ReadonlyMap<string, string | null>;
  regionOfDistrict: ReadonlyMap<string, string | null>;
};
