import { defineCommandMenuItem, numberOfSelectedRecords } from 'twenty-sdk/define';

import { STOCK_WAREHOUSE_ORDERPOINT_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/stock/stock-universal-identifiers.constant';
import { FORECAST_UNIVERSAL_IDENTIFIERS } from 'src/stock/stock-reports-universal-identifiers.constant';

export default defineCommandMenuItem({
  universalIdentifier: FORECAST_UNIVERSAL_IDENTIFIERS.orderpointCommand,
  label: 'Forecast',
  shortLabel: 'Forecast',
  isPinned: false,
  availabilityType: 'RECORD_SELECTION',
  availabilityObjectUniversalIdentifier: STOCK_WAREHOUSE_ORDERPOINT_OBJECT_UNIVERSAL_IDENTIFIER,
  conditionalAvailabilityExpression: numberOfSelectedRecords === 1,
  frontComponentUniversalIdentifier: FORECAST_UNIVERSAL_IDENTIFIERS.widget,
});
