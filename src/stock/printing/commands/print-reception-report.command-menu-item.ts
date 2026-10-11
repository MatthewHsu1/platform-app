import { defineCommandMenuItem, noneEquals, selectedRecords } from 'twenty-sdk/define';

import { MORE_PRINT_UNIVERSAL_IDENTIFIERS } from 'src/stock/stock-printing-universal-identifiers.constant';
import { STOCK_PICKING_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/stock/stock-universal-identifiers.constant';

// Written out here: the build turns the condition into text from this file's source.
export default defineCommandMenuItem({
  universalIdentifier: MORE_PRINT_UNIVERSAL_IDENTIFIERS.receptionReportCommand,
  label: 'Print: Reception Report',
  icon: 'IconPrinter',
  availabilityType: 'RECORD_SELECTION',
  availabilityObjectUniversalIdentifier: STOCK_PICKING_OBJECT_UNIVERSAL_IDENTIFIER,
  conditionalAvailabilityExpression: noneEquals(selectedRecords, 'pickingTypeCode', 'OUTGOING'),
  frontComponentUniversalIdentifier: MORE_PRINT_UNIVERSAL_IDENTIFIERS.receptionReportFrontComponent,
});
