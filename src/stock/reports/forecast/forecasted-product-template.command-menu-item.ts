import { defineCommandMenuItem, everyEquals, numberOfSelectedRecords, selectedRecords } from 'twenty-sdk/define';

import { PRODUCT_TEMPLATE_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/product/product-universal-identifiers.constant';
import { FORECAST_UNIVERSAL_IDENTIFIERS } from 'src/stock/stock-reports-universal-identifiers.constant';

export default defineCommandMenuItem({
  universalIdentifier: FORECAST_UNIVERSAL_IDENTIFIERS.productTemplateCommand,
  label: 'Forecasted',
  shortLabel: 'Forecasted',
  isPinned: false,
  availabilityType: 'RECORD_SELECTION',
  availabilityObjectUniversalIdentifier: PRODUCT_TEMPLATE_OBJECT_UNIVERSAL_IDENTIFIER,
  conditionalAvailabilityExpression: numberOfSelectedRecords === 1 && everyEquals(selectedRecords, 'isStorable', true),
  frontComponentUniversalIdentifier: FORECAST_UNIVERSAL_IDENTIFIERS.widget,
});
