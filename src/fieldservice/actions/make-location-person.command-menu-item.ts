import { defineCommandMenuItem, isSelectAll, numberOfSelectedRecords, STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS } from 'twenty-sdk/define';

import { FIELDSERVICE_ACTION_UNIVERSAL_IDENTIFIERS } from 'src/fieldservice/fieldservice-universal-identifiers.constant';

// The level the button needs is checked by the logic function: a condition cannot read it.
export default defineCommandMenuItem({
  universalIdentifier: FIELDSERVICE_ACTION_UNIVERSAL_IDENTIFIERS.personToLocationCommandMenuItem,
  label: 'Make a service location',
  shortLabel: 'Service location',
  icon: 'IconMapPinPlus',
  isPinned: false,
  availabilityType: 'RECORD_SELECTION',
  availabilityObjectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.universalIdentifier,
  conditionalAvailabilityExpression: numberOfSelectedRecords === 1 && !isSelectAll,
  frontComponentUniversalIdentifier: FIELDSERVICE_ACTION_UNIVERSAL_IDENTIFIERS.makeLocationFrontComponent,
});
