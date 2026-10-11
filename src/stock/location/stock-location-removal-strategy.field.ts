import { defineField, OnDeleteAction } from 'twenty-sdk/define';

import { manyToOneField } from 'src/shared/fields';
import {
  PRODUCT_REMOVAL_FIELD_UNIVERSAL_IDENTIFIERS,
  PRODUCT_REMOVAL_OBJECT_UNIVERSAL_IDENTIFIER,
  ROUTING_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS,
} from 'src/stock/routing-universal-identifiers.constant';
import { STOCK_LOCATION_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/stock/stock-universal-identifiers.constant';

export default defineField({
  ...manyToOneField({
    universalIdentifier: ROUTING_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS.stockLocationRemovalStrategy,
    name: 'removalStrategy',
    label: 'Removal Strategy',
    icon: 'IconArrowsSort',
    onDelete: OnDeleteAction.SET_NULL,
    targetObjectUniversalIdentifier: PRODUCT_REMOVAL_OBJECT_UNIVERSAL_IDENTIFIER,
    targetFieldUniversalIdentifier: PRODUCT_REMOVAL_FIELD_UNIVERSAL_IDENTIFIERS.locations,
  }),
  objectUniversalIdentifier: STOCK_LOCATION_OBJECT_UNIVERSAL_IDENTIFIER,
});
