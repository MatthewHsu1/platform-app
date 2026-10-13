import { defineField, STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS } from 'twenty-sdk/define';

import { oneToManyField } from 'src/shared/fields';
import {
  ROUTING_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS,
  STOCK_RULE_FIELD_UNIVERSAL_IDENTIFIERS,
  STOCK_RULE_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/stock/routing-universal-identifiers.constant';

export default defineField({
  ...oneToManyField({
    universalIdentifier: ROUTING_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS.personPartnerAddressRules,
    name: 'partnerAddressStockRules',
    label: 'Stock rules delivering here',
    icon: 'IconArrowsSplit',
    targetObjectUniversalIdentifier: STOCK_RULE_OBJECT_UNIVERSAL_IDENTIFIER,
    targetFieldUniversalIdentifier: STOCK_RULE_FIELD_UNIVERSAL_IDENTIFIERS.partnerAddressPerson,
  }),
  objectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.universalIdentifier,
});
