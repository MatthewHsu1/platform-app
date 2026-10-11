import { defineCommandMenuItem, numberOfSelectedRecords } from 'twenty-sdk/define';

import { PRODUCT_TEMPLATE_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/product/product-universal-identifiers.constant';
import { PRODUCT_ROUTES_UNIVERSAL_IDENTIFIERS } from 'src/stock/stock-reports-universal-identifiers.constant';

export default defineCommandMenuItem({
  universalIdentifier: PRODUCT_ROUTES_UNIVERSAL_IDENTIFIERS.commandMenuItem,
  label: 'Product Routes Report',
  shortLabel: 'Routes',
  isPinned: false,
  availabilityType: 'RECORD_SELECTION',
  availabilityObjectUniversalIdentifier: PRODUCT_TEMPLATE_OBJECT_UNIVERSAL_IDENTIFIER,
  conditionalAvailabilityExpression: numberOfSelectedRecords === 1,
  frontComponentUniversalIdentifier: PRODUCT_ROUTES_UNIVERSAL_IDENTIFIERS.frontComponent,
});
