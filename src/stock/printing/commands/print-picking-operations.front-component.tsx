import { defineFrontComponent } from 'twenty-sdk/define';

import { PICKING_OPERATIONS_TEXT } from 'src/stock/printing/commands/print-picking-ready.front-component';
import { makePrintPopup } from 'src/stock/printing/print-popup';
import { PICKING_PRINT_UNIVERSAL_IDENTIFIERS } from 'src/stock/stock-printing-universal-identifiers.constant';

export default defineFrontComponent({
  universalIdentifier: PICKING_PRINT_UNIVERSAL_IDENTIFIERS.pickingOperationsFrontComponent,
  name: 'platform-stock-print-picking-operations',
  description: 'Prints the picking operations of the selected transfers; ready ones are marked printed.',
  component: makePrintPopup('pickingOperations', PICKING_OPERATIONS_TEXT),
});
