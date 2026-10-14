import { OnDeleteAction, STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS, defineField } from 'twenty-sdk/define';

import {
  FIELDSERVICE_STOCK_FIELD_UNIVERSAL_IDENTIFIERS,
  FIELDSERVICE_STOCK_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS,
} from 'src/fieldservice-stock/fieldservice-stock-universal-identifiers.constant';
import { FSM_LOCATION_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/fieldservice/fieldservice-universal-identifiers.constant';
import { manyToOneField } from 'src/shared/fields';

export default defineField({
  ...manyToOneField({
    universalIdentifier: FIELDSERVICE_STOCK_FIELD_UNIVERSAL_IDENTIFIERS.fsmLocationShippingAddressPerson,
    name: 'shippingAddressPerson',
    label: 'Shipping location (contact)',
    icon: 'IconUser',
    onDelete: OnDeleteAction.SET_NULL,
    targetObjectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.universalIdentifier,
    targetFieldUniversalIdentifier: FIELDSERVICE_STOCK_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS.personShippingFsmLocations,
  }),
  objectUniversalIdentifier: FSM_LOCATION_OBJECT_UNIVERSAL_IDENTIFIER,
});
