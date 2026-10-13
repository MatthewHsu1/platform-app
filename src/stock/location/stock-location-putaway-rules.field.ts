import { defineField } from 'twenty-sdk/define';

import { oneToManyField } from 'src/shared/fields';
import {
  ROUTING_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS,
  STOCK_PUTAWAY_RULE_FIELD_UNIVERSAL_IDENTIFIERS,
  STOCK_PUTAWAY_RULE_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/stock/routing-universal-identifiers.constant';
import { STOCK_LOCATION_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/stock/stock-universal-identifiers.constant';

export default defineField({
  ...oneToManyField({
    universalIdentifier: ROUTING_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS.stockLocationPutawayRules,
    name: 'putawayRules',
    label: 'Putaway rules',
    icon: 'IconArrowBarToDown',
    targetObjectUniversalIdentifier: STOCK_PUTAWAY_RULE_OBJECT_UNIVERSAL_IDENTIFIER,
    targetFieldUniversalIdentifier: STOCK_PUTAWAY_RULE_FIELD_UNIVERSAL_IDENTIFIERS.locationIn,
  }),
  objectUniversalIdentifier: STOCK_LOCATION_OBJECT_UNIVERSAL_IDENTIFIER,
});
