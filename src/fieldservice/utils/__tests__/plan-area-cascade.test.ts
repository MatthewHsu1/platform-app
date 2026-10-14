import { describe, expect, it } from 'vitest';

import { type AreaLookups } from 'src/fieldservice/types/area-lookups.type';
import { planAreaCascade } from 'src/fieldservice/utils/plan-area-cascade.util';

const lookups: AreaLookups = {
  branchOfTerritory: new Map([
    ['north-zip', 'north-branch'],
    ['south-zip', 'south-branch'],
  ]),
  districtOfBranch: new Map([
    ['north-branch', 'east-district'],
    ['south-branch', 'west-district'],
  ]),
  regionOfDistrict: new Map([
    ['east-district', 'us-region'],
    ['west-district', 'us-region'],
  ]),
};

const empty = { territoryId: null, branchId: null, districtId: null, regionId: null };
const none = { location: false, territory: false, branch: false, district: false, region: false };

describe('planAreaCascade', () => {
  it('fills branch, district and region from a new territory', () => {
    expect(planAreaCascade({ current: { ...empty, territoryId: 'north-zip' }, written: { ...none, territory: true }, locationTerritoryId: null, lookups })).toEqual({
      branchId: 'north-branch',
      districtId: 'east-district',
      regionId: 'us-region',
    });
  });

  it('takes the territory of a new location and its whole chain', () => {
    expect(planAreaCascade({ current: empty, written: { ...none, location: true }, locationTerritoryId: 'south-zip', lookups })).toEqual({
      territoryId: 'south-zip',
      branchId: 'south-branch',
      districtId: 'west-district',
      regionId: 'us-region',
    });
  });

  it('clears the levels below a cleared territory', () => {
    const current = { territoryId: null, branchId: 'north-branch', districtId: 'east-district', regionId: 'us-region' };

    expect(planAreaCascade({ current, written: { ...none, territory: true }, locationTerritoryId: null, lookups })).toEqual({
      branchId: null,
      districtId: null,
      regionId: null,
    });
  });

  it('keeps a branch written in the same save and fills the levels below from it', () => {
    const current = { territoryId: 'north-zip', branchId: 'south-branch', districtId: null, regionId: null };

    expect(planAreaCascade({ current, written: { ...none, territory: true, branch: true }, locationTerritoryId: null, lookups })).toEqual({
      districtId: 'west-district',
      regionId: 'us-region',
    });
  });

  it('changes nothing when no level was written', () => {
    expect(planAreaCascade({ current: { ...empty, territoryId: 'north-zip' }, written: none, locationTerritoryId: null, lookups })).toEqual({});
  });
});
