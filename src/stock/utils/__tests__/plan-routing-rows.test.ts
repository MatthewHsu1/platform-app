import { describe, expect, it } from 'vitest';

import {
  capacityName,
  planPutawayRuleSync,
  planRuleTypeLocations,
  putawayRulesLosingLinks,
} from 'src/stock/utils/plan-routing-rows.util';

const type = { defaultLocationSrcId: 'vendors', defaultLocationDestId: 'stock' };

describe('planRuleTypeLocations', () => {
  it('fills the empty locations of a new rule from its operation type', () => {
    expect(
      planRuleTypeLocations({
        operation: 'created',
        updatedFields: [],
        rule: { pickingTypeId: 'in', locationSrcId: null, locationDestId: 'shelf' },
        pickingType: type,
      }),
    ).toEqual({ locationSrcId: 'vendors' });
  });

  it('copies both locations when a user picks another type without touching the locations', () => {
    expect(
      planRuleTypeLocations({
        operation: 'updated',
        updatedFields: ['pickingType'],
        rule: { pickingTypeId: 'in', locationSrcId: 'x', locationDestId: 'y' },
        pickingType: type,
      }),
    ).toEqual({ locationSrcId: 'vendors', locationDestId: 'stock' });
    expect(
      planRuleTypeLocations({
        operation: 'updated',
        updatedFields: ['pickingType', 'locationDest'],
        rule: { pickingTypeId: 'in', locationSrcId: 'x', locationDestId: 'y' },
        pickingType: type,
      }),
    ).toEqual({});
  });
});

describe('planPutawayRuleSync', () => {
  const rule = {
    name: null,
    locationInId: 'stock',
    locationOutId: 'shelf1',
    storageCategoryId: 'small',
    sublocation: 'NO' as const,
  };

  it('names the rule and drops the storage category unless it stores to the closest location', () => {
    expect(
      planPutawayRuleSync({
        rule,
        locationInChanged: false,
        label: 'Belts',
        locationInName: 'WH/Stock',
        locationOutName: 'WH/Stock/Shelf 1',
        isLocationOutUnderIn: true,
      }),
    ).toEqual({ name: 'Belts: WH/Stock → WH/Stock/Shelf 1', storageCategoryId: null });
    expect(
      planPutawayRuleSync({
        rule: { ...rule, name: 'Belts: WH/Stock → WH/Stock/Shelf 1', sublocation: 'CLOSEST_LOCATION' },
        locationInChanged: false,
        label: 'Belts',
        locationInName: 'WH/Stock',
        locationOutName: 'WH/Stock/Shelf 1',
        isLocationOutUnderIn: true,
      }),
    ).toEqual({});
  });

  it('moves the store-to location to the new arrival location when it is not inside it', () => {
    expect(
      planPutawayRuleSync({
        rule: { ...rule, locationInId: 'input', sublocation: 'CLOSEST_LOCATION' },
        locationInChanged: true,
        label: 'All products',
        locationInName: 'WH/Input',
        locationOutName: 'WH/Stock/Shelf 1',
        isLocationOutUnderIn: false,
      }),
    ).toEqual({ name: 'All products: WH/Input → WH/Input', locationOutId: 'input' });
  });
});

describe('capacityName', () => {
  it('names a capacity by its product or package type and quantity', () => {
    expect(capacityName({ productName: 'Belts', packageTypeName: null, quantity: 40 })).toBe('Belts: 40');
    expect(capacityName({ productName: null, packageTypeName: 'Pallet', quantity: 2 })).toBe('Pallet: 2');
  });
});

describe('putawayRulesLosingLinks', () => {
  it('drops the links of rules staff deleted and of rules whose parent stays deleted', () => {
    expect(
      putawayRulesLosingLinks({
        rules: [
          { id: 'by-staff', isStaffDelete: true, parentIds: ['stock', 'shelf1', null, null, null] },
          { id: 'with-deleted-shelf', isStaffDelete: false, parentIds: ['stock', 'shelf2', null, null, null] },
          { id: 'shelf-put-back', isStaffDelete: false, parentIds: ['stock', 'shelf3', null, null, null] },
        ],
        deletedParentIds: new Set(['shelf2']),
      }),
    ).toEqual(['by-staff', 'with-deleted-shelf']);
  });
});
