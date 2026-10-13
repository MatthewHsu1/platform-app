import { defineCommandMenuItem, everyEquals, selectedRecords } from 'twenty-sdk/define';

import { PICKING_PRINT_UNIVERSAL_IDENTIFIERS } from 'src/stock/stock-printing-universal-identifiers.constant';
import { STOCK_PICKING_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/stock/stock-universal-identifiers.constant';

// On a ready transfer Print gives the picking operations; on a done one, the delivery slip.
export default defineCommandMenuItem({
  universalIdentifier: PICKING_PRINT_UNIVERSAL_IDENTIFIERS.printReadyCommand,
  label: 'Print',
  shortLabel: 'Print',
  icon: 'IconPrinter',
  isPinned: true,
  availabilityType: 'RECORD_SELECTION',
  availabilityObjectUniversalIdentifier: STOCK_PICKING_OBJECT_UNIVERSAL_IDENTIFIER,
  conditionalAvailabilityExpression: everyEquals(selectedRecords, 'state', 'ASSIGNED'),
  frontComponentUniversalIdentifier: PICKING_PRINT_UNIVERSAL_IDENTIFIERS.printReadyFrontComponent,
});
