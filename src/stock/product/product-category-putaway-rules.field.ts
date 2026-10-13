import { defineField } from 'twenty-sdk/define';

import { PRODUCT_CATEGORY_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/product/product-universal-identifiers.constant';
import { oneToManyField } from 'src/shared/fields';
import {
  ROUTING_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS,
  STOCK_PUTAWAY_RULE_FIELD_UNIVERSAL_IDENTIFIERS,
  STOCK_PUTAWAY_RULE_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/stock/routing-universal-identifiers.constant';

export default defineField({
  ...oneToManyField({
    universalIdentifier: ROUTING_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS.productCategoryPutawayRules,
    name: 'putawayRules',
    label: 'Putaway rules',
    icon: 'IconArrowBarToDown',
    targetObjectUniversalIdentifier: STOCK_PUTAWAY_RULE_OBJECT_UNIVERSAL_IDENTIFIER,
    targetFieldUniversalIdentifier: STOCK_PUTAWAY_RULE_FIELD_UNIVERSAL_IDENTIFIERS.category,
  }),
  objectUniversalIdentifier: PRODUCT_CATEGORY_OBJECT_UNIVERSAL_IDENTIFIER,
});
