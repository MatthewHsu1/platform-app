import { defineFrontComponent } from 'twenty-sdk/define';
import { msg } from 'twenty-sdk/front-component';

import { PRINT_TEXT } from 'src/stock/printing/commands/print-picking-ready.front-component';
import { makePrintPopup } from 'src/stock/printing/print-popup';
import { type PrintText } from 'src/stock/printing/types/print-text.type';
import { PICKING_PRINT_UNIVERSAL_IDENTIFIERS } from 'src/stock/stock-printing-universal-identifiers.constant';

export const DELIVERY_SLIP_TEXT: PrintText = { ...PRINT_TEXT, open: msg('Open Delivery Slip') };

export default defineFrontComponent({
  universalIdentifier: PICKING_PRINT_UNIVERSAL_IDENTIFIERS.deliverySlipFrontComponent,
  name: 'platform-stock-print-delivery-slip',
  description: 'Prints the delivery slip of the selected transfers.',
  component: makePrintPopup('deliverySlip', DELIVERY_SLIP_TEXT),
});
