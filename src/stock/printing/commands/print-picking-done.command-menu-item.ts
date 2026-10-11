import { defineCommandMenuItem, everyEquals, selectedRecords } from 'twenty-sdk/define';

import { PICKING_PRINT_UNIVERSAL_IDENTIFIERS } from 'src/stock/stock-printing-universal-identifiers.constant';
import { STOCK_PICKING_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/stock/stock-universal-identifiers.constant';

export default defineCommandMenuItem({
  universalIdentifier: PICKING_PRINT_UNIVERSAL_IDENTIFIERS.printDoneCommand,
  label: 'Print',
  shortLabel: 'Print',
  icon: 'IconPrinter',
  isPinned: true,
  availabilityType: 'RECORD_SELECTION',
  availabilityObjectUniversalIdentifier: STOCK_PICKING_OBJECT_UNIVERSAL_IDENTIFIER,
  conditionalAvailabilityExpression: everyEquals(selectedRecords, 'state', 'DONE'),
  frontComponentUniversalIdentifier: PICKING_PRINT_UNIVERSAL_IDENTIFIERS.printDoneFrontComponent,
});
