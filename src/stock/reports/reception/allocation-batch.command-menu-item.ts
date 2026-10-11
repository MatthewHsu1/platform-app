import { defineCommandMenuItem, noneEquals, numberOfSelectedRecords, selectedRecords } from 'twenty-sdk/define';

import { STOCK_PICKING_BATCH_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/stock-picking-batch/stock-picking-batch-universal-identifiers.constant';
import { RECEPTION_UNIVERSAL_IDENTIFIERS } from 'src/stock/stock-reports-universal-identifiers.constant';

// The reception report of every transfer in the batch.
export default defineCommandMenuItem({
  universalIdentifier: RECEPTION_UNIVERSAL_IDENTIFIERS.batchCommand,
  label: 'Allocation',
  shortLabel: 'Allocation',
  icon: 'IconList',
  isPinned: false,
  availabilityType: 'RECORD_SELECTION',
  availabilityObjectUniversalIdentifier: STOCK_PICKING_BATCH_OBJECT_UNIVERSAL_IDENTIFIER,
  conditionalAvailabilityExpression: numberOfSelectedRecords === 1 && noneEquals(selectedRecords, 'state', 'CANCEL'),
  frontComponentUniversalIdentifier: RECEPTION_UNIVERSAL_IDENTIFIERS.widget,
});
