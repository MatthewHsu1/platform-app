import { defineFrontComponent } from 'twenty-sdk/define';

import { DELIVERY_SLIP_TEXT } from 'src/stock/printing/commands/print-delivery-slip.front-component';
import { makePrintPopup } from 'src/stock/printing/print-popup';
import { PICKING_PRINT_UNIVERSAL_IDENTIFIERS } from 'src/stock/stock-printing-universal-identifiers.constant';

export default defineFrontComponent({
  universalIdentifier: PICKING_PRINT_UNIVERSAL_IDENTIFIERS.printDoneFrontComponent,
  name: 'platform-stock-print-picking-done',
  description: 'Prints the delivery slip of done transfers.',
  component: makePrintPopup('deliverySlip', DELIVERY_SLIP_TEXT),
});
