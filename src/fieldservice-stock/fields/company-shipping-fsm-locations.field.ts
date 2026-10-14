import { STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS, defineField } from 'twenty-sdk/define';

import {
  FIELDSERVICE_STOCK_FIELD_UNIVERSAL_IDENTIFIERS,
  FIELDSERVICE_STOCK_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS,
} from 'src/fieldservice-stock/fieldservice-stock-universal-identifiers.constant';
import { FSM_LOCATION_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/fieldservice/fieldservice-universal-identifiers.constant';
import { oneToManyField } from 'src/shared/fields';

export default defineField({
  ...oneToManyField({
    universalIdentifier: FIELDSERVICE_STOCK_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS.companyShippingFsmLocations,
    name: 'fsmLocationsShipping',
    label: 'Service locations shipping here',
    icon: 'IconMapPin',
    targetObjectUniversalIdentifier: FSM_LOCATION_OBJECT_UNIVERSAL_IDENTIFIER,
    targetFieldUniversalIdentifier: FIELDSERVICE_STOCK_FIELD_UNIVERSAL_IDENTIFIERS.fsmLocationShippingAddressCompany,
  }),
  objectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.company.universalIdentifier,
});
