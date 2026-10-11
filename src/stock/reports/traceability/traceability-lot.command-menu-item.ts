import { defineCommandMenuItem, numberOfSelectedRecords } from 'twenty-sdk/define';

import { TRACEABILITY_UNIVERSAL_IDENTIFIERS } from 'src/stock/stock-reports-universal-identifiers.constant';
import { STOCK_LOT_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/stock/stock-universal-identifiers.constant';

export default defineCommandMenuItem({
  universalIdentifier: TRACEABILITY_UNIVERSAL_IDENTIFIERS.lotCommand,
  label: 'Traceability',
  shortLabel: 'Traceability',
  icon: 'IconArrowUp',
  isPinned: false,
  availabilityType: 'RECORD_SELECTION',
  availabilityObjectUniversalIdentifier: STOCK_LOT_OBJECT_UNIVERSAL_IDENTIFIER,
  conditionalAvailabilityExpression: numberOfSelectedRecords === 1,
  frontComponentUniversalIdentifier: TRACEABILITY_UNIVERSAL_IDENTIFIERS.widget,
});
