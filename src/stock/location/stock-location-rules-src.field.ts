import { defineField } from 'twenty-sdk/define';

import { oneToManyField } from 'src/shared/fields';
import {
  ROUTING_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS,
  STOCK_RULE_FIELD_UNIVERSAL_IDENTIFIERS,
  STOCK_RULE_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/stock/routing-universal-identifiers.constant';
import { STOCK_LOCATION_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/stock/stock-universal-identifiers.constant';

export default defineField({
  ...oneToManyField({
    universalIdentifier: ROUTING_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS.stockLocationRulesSrc,
    name: 'rulesSrc',
    label: 'Rules from this location',
    icon: 'IconArrowsSplit',
    targetObjectUniversalIdentifier: STOCK_RULE_OBJECT_UNIVERSAL_IDENTIFIER,
    targetFieldUniversalIdentifier: STOCK_RULE_FIELD_UNIVERSAL_IDENTIFIERS.locationSrc,
  }),
  objectUniversalIdentifier: STOCK_LOCATION_OBJECT_UNIVERSAL_IDENTIFIER,
});
