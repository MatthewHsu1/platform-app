import { defineFrontComponent } from 'twenty-sdk/define';
import { msg } from 'twenty-sdk/front-component';

import { PRINT_TEXT } from 'src/stock/printing/commands/print-picking-ready.front-component';
import { makePrintPopup } from 'src/stock/printing/print-popup';
import { PICKING_PRINT_UNIVERSAL_IDENTIFIERS } from 'src/stock/stock-printing-universal-identifiers.constant';

export default defineFrontComponent({
  universalIdentifier: PICKING_PRINT_UNIVERSAL_IDENTIFIERS.returnSlipFrontComponent,
  name: 'platform-stock-print-return-slip',
  description: 'Prints the return slip of the selected transfers.',
  component: makePrintPopup('returnSlip', { ...PRINT_TEXT, open: msg('Open Return Slip') }),
});
