import { defineCommandMenuItem, noneEquals, numberOfSelectedRecords, selectedRecords } from 'twenty-sdk/define';

import { RECEPTION_UNIVERSAL_IDENTIFIERS } from 'src/stock/stock-reports-universal-identifiers.constant';
import { STOCK_PICKING_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/stock/stock-universal-identifiers.constant';

// Not on deliveries or cancelled transfers. Whether a delivery waits for the
// goods is answered by the report, which then offers the Allocate buttons.
export default defineCommandMenuItem({
  universalIdentifier: RECEPTION_UNIVERSAL_IDENTIFIERS.pickingCommand,
  label: 'Allocation',
  shortLabel: 'Allocation',
  isPinned: false,
  availabilityType: 'RECORD_SELECTION',
  availabilityObjectUniversalIdentifier: STOCK_PICKING_OBJECT_UNIVERSAL_IDENTIFIER,
  conditionalAvailabilityExpression:
    numberOfSelectedRecords >= 1 &&
    noneEquals(selectedRecords, 'pickingTypeCode', 'OUTGOING') &&
    noneEquals(selectedRecords, 'state', 'CANCEL'),
  frontComponentUniversalIdentifier: RECEPTION_UNIVERSAL_IDENTIFIERS.widget,
});
