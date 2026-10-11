import { defineCommandMenuItem, numberOfSelectedRecords } from 'twenty-sdk/define';

import { PRODUCT_PRODUCT_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/product/product-universal-identifiers.constant';
import { STATUS_BUTTON_UNIVERSAL_IDENTIFIERS } from 'src/stock/stock-reports-universal-identifiers.constant';

export default defineCommandMenuItem({
  universalIdentifier: STATUS_BUTTON_UNIVERSAL_IDENTIFIERS.variantHistoryCommandMenuItem,
  label: 'History',
  shortLabel: 'History',
  isPinned: false,
  availabilityType: 'RECORD_SELECTION',
  availabilityObjectUniversalIdentifier: PRODUCT_PRODUCT_OBJECT_UNIVERSAL_IDENTIFIER,
  conditionalAvailabilityExpression: numberOfSelectedRecords === 1,
  frontComponentUniversalIdentifier: STATUS_BUTTON_UNIVERSAL_IDENTIFIERS.variantHistoryFrontComponent,
});
