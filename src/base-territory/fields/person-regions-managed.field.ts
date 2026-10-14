import { defineField, STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS } from 'twenty-sdk/define';

import {
  BASE_TERRITORY_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS,
  RES_REGION_FIELD_UNIVERSAL_IDENTIFIERS,
  RES_REGION_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/base-territory/base-territory-universal-identifiers.constant';
import { oneToManyField } from 'src/shared/fields';

export default defineField({
  ...oneToManyField({
    universalIdentifier: BASE_TERRITORY_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS.personRegionsManaged,
    name: 'resRegionsManaged',
    label: 'Regions managed',
    icon: 'IconWorld',
    targetObjectUniversalIdentifier: RES_REGION_OBJECT_UNIVERSAL_IDENTIFIER,
    targetFieldUniversalIdentifier: RES_REGION_FIELD_UNIVERSAL_IDENTIFIERS.partner,
  }),
  objectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.universalIdentifier,
});
