import { type PutawayRuleRow } from 'src/stock/utils/types/putaway-rule-row.type';

type RuleLocations = { locationSrcId: string | null; locationDestId: string | null };

const LOCATION_FIELDS = ['locationSrc', 'locationSrcId', 'locationDest', 'locationDestId'];

// Picking an operation type on a rule copies the type's default locations: on
// create into the empty ones, on a later edit into both unless the same save
// changed a location.
export const planRuleTypeLocations = ({
  operation,
  updatedFields,
  rule,
  pickingType,
}: {
  operation: 'created' | 'updated';
  updatedFields: string[];
  rule: RuleLocations & { pickingTypeId: string | null };
  pickingType: { defaultLocationSrcId: string | null; defaultLocationDestId: string | null } | null;
}): Partial<RuleLocations> => {
  if (pickingType === null) {
    return {};
  }
  if (operation === 'created') {
    return {
      ...(rule.locationSrcId === null && pickingType.defaultLocationSrcId !== null
        ? { locationSrcId: pickingType.defaultLocationSrcId }
        : {}),
      ...(rule.locationDestId === null && pickingType.defaultLocationDestId !== null
        ? { locationDestId: pickingType.defaultLocationDestId }
        : {}),
    };
  }
  const typeChanged = updatedFields.includes('pickingType') || updatedFields.includes('pickingTypeId');
  const locationTouched = LOCATION_FIELDS.some((field) => updatedFields.includes(field));

  if (!typeChanged || locationTouched) {
    return {};
  }
  const values: Partial<RuleLocations> = {};

  if (rule.locationSrcId !== pickingType.defaultLocationSrcId) {
    values.locationSrcId = pickingType.defaultLocationSrcId;
  }
  if (rule.locationDestId !== pickingType.defaultLocationDestId) {
    values.locationDestId = pickingType.defaultLocationDestId;
  }
  return values;
};

// A putaway rule's name, its storage category kept only for "closest
// location", and its store-to location kept inside a changed arrival location.
export const planPutawayRuleSync = ({
  rule,
  locationInChanged,
  label,
  locationInName,
  locationOutName,
  isLocationOutUnderIn,
}: {
  rule: PutawayRuleRow;
  locationInChanged: boolean;
  label: string;
  locationInName: string;
  locationOutName: string;
  isLocationOutUnderIn: boolean;
}): Partial<PutawayRuleRow> => {
  const values: Partial<PutawayRuleRow> = {};
  const moveOut = locationInChanged && rule.locationInId !== null && (rule.locationOutId === null || !isLocationOutUnderIn);
  const name = `${label}: ${locationInName} → ${moveOut ? locationInName : locationOutName}`;

  if (rule.name !== name) {
    values.name = name;
  }
  if (rule.sublocation !== 'CLOSEST_LOCATION' && rule.storageCategoryId !== null) {
    values.storageCategoryId = null;
  }
  if (moveOut && rule.locationOutId !== rule.locationInId) {
    values.locationOutId = rule.locationInId;
  }
  return values;
};

// "Belts: 40", "Pallet: 2".
export const capacityName = ({
  productName,
  packageTypeName,
  quantity,
}: {
  productName: string | null;
  packageTypeName: string | null;
  quantity: number;
}) => `${productName ?? packageTypeName ?? ''}: ${quantity}`;

// A deleted putaway rule loses its package type links for good when staff
// deleted it, or when it went with a parent that is still deleted. A rule
// whose parent was put back comes back with that parent, links included.
export const putawayRulesLosingLinks = ({
  rules,
  deletedParentIds,
}: {
  rules: { id: string; isStaffDelete: boolean; parentIds: (string | null)[] }[];
  deletedParentIds: Set<string>;
}) =>
  rules
    .filter(
      (rule) => rule.isStaffDelete || rule.parentIds.some((parentId) => parentId !== null && deletedParentIds.has(parentId)),
    )
    .map((rule) => rule.id);
