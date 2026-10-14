import { describe, expect, it } from 'vitest';

import { areaLevelsWritten } from 'src/fieldservice/utils/area-levels-written.util';

const held = { territoryId: 'north-zip', branchId: null, districtId: 'east-district', regionId: null };

describe('areaLevelsWritten', () => {
  it('counts every level a new row holds as written', () => {
    expect(areaLevelsWritten(true, held, new Set())).toEqual({ territory: true, branch: false, district: true, region: false });
  });

  it('counts only the listed fields of a change as written', () => {
    expect(areaLevelsWritten(false, held, new Set(['branchId']))).toEqual({ territory: false, branch: true, district: false, region: false });
  });
});
