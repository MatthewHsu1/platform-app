import { defineCommandMenuItem, everyEquals, numberOfSelectedRecords, selectedRecords } from 'twenty-sdk/define';

import { TRACEABILITY_UNIVERSAL_IDENTIFIERS } from 'src/stock/stock-reports-universal-identifiers.constant';
import { STOCK_PICKING_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/stock/stock-universal-identifiers.constant';

// On one done transfer. Whether it moved tracked products is not stored, so a
// transfer without lots opens an empty report.
export default defineCommandMenuItem({
  universalIdentifier: TRACEABILITY_UNIVERSAL_IDENTIFIERS.pickingCommand,
  label: 'Traceability',
  shortLabel: 'Traceability',
  icon: 'IconArrowUp',
  isPinned: false,
  availabilityType: 'RECORD_SELECTION',
  availabilityObjectUniversalIdentifier: STOCK_PICKING_OBJECT_UNIVERSAL_IDENTIFIER,
  conditionalAvailabilityExpression: numberOfSelectedRecords === 1 && everyEquals(selectedRecords, 'state', 'DONE'),
  frontComponentUniversalIdentifier: TRACEABILITY_UNIVERSAL_IDENTIFIERS.widget,
});
