import { defineCommandMenuItem, everyEquals, selectedRecords } from 'twenty-sdk/define';

import { MORE_PRINT_UNIVERSAL_IDENTIFIERS } from 'src/stock/stock-printing-universal-identifiers.constant';
import { STOCK_PICKING_BATCH_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/stock-picking-batch/stock-picking-batch-universal-identifiers.constant';

// Written out here: the build turns the condition into text from this file's source.
export default defineCommandMenuItem({
  universalIdentifier: MORE_PRINT_UNIVERSAL_IDENTIFIERS.batchTransferCommand,
  label: 'Print: Batch Transfer',
  icon: 'IconPrinter',
  availabilityType: 'RECORD_SELECTION',
  availabilityObjectUniversalIdentifier: STOCK_PICKING_BATCH_OBJECT_UNIVERSAL_IDENTIFIER,
  conditionalAvailabilityExpression:
    everyEquals(selectedRecords, 'state', 'IN_PROGRESS') || everyEquals(selectedRecords, 'state', 'DONE'),
  frontComponentUniversalIdentifier: MORE_PRINT_UNIVERSAL_IDENTIFIERS.batchTransferFrontComponent,
});
