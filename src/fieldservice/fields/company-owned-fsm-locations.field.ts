import { defineField, STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS } from 'twenty-sdk/define';

import {
  FIELDSERVICE_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS,
  FSM_LOCATION_FIELD_UNIVERSAL_IDENTIFIERS,
  FSM_LOCATION_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/fieldservice/fieldservice-universal-identifiers.constant';
import { oneToManyField } from 'src/shared/fields';

export default defineField({
  ...oneToManyField({
    universalIdentifier: FIELDSERVICE_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS.companyOwnedFsmLocations,
    name: 'fsmLocationsOwned',
    label: 'Owned service locations',
    icon: 'IconMapPin',
    targetObjectUniversalIdentifier: FSM_LOCATION_OBJECT_UNIVERSAL_IDENTIFIER,
    targetFieldUniversalIdentifier: FSM_LOCATION_FIELD_UNIVERSAL_IDENTIFIERS.ownerCompany,
  }),
  objectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.company.universalIdentifier,
});
