import { defineField } from 'twenty-sdk/define';

import { PRODUCT_TEMPLATE_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/product/product-universal-identifiers.constant';
import { booleanField } from 'src/shared/fields';
import { STOCK_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS } from 'src/stock/stock-universal-identifiers.constant';

// Only goods can be storable; a trigger clears it for other product types.
export default defineField({
  ...booleanField(FIELD_IDS.productTemplateIsStorable, 'isStorable', 'Track inventory', 'IconBuildingWarehouse', false),
  objectUniversalIdentifier: PRODUCT_TEMPLATE_OBJECT_UNIVERSAL_IDENTIFIER,
});
