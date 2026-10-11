import { defineCommandMenuItem } from 'twenty-sdk/define';

import { PRODUCT_PRODUCT_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/product/product-universal-identifiers.constant';
import { INVENTORY_AT_DATE_UNIVERSAL_IDENTIFIERS } from 'src/stock/stock-reports-universal-identifiers.constant';

export default defineCommandMenuItem({
  universalIdentifier: INVENTORY_AT_DATE_UNIVERSAL_IDENTIFIERS.commandMenuItem,
  label: 'Inventory at Date',
  icon: 'IconHistory',
  isPinned: false,
  availabilityType: 'GLOBAL_OBJECT_CONTEXT',
  availabilityObjectUniversalIdentifier: PRODUCT_PRODUCT_OBJECT_UNIVERSAL_IDENTIFIER,
  frontComponentUniversalIdentifier: INVENTORY_AT_DATE_UNIVERSAL_IDENTIFIERS.frontComponent,
});
