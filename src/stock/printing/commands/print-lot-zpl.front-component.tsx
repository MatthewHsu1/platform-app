import { defineFrontComponent } from 'twenty-sdk/define';
import { msg } from 'twenty-sdk/front-component';

import { PRINT_TEXT } from 'src/stock/printing/commands/print-picking-ready.front-component';
import { makePrintPopup } from 'src/stock/printing/print-popup';
import { type PrintText } from 'src/stock/printing/types/print-text.type';
import { ZPL_PRINT_UNIVERSAL_IDENTIFIERS } from 'src/stock/stock-printing-universal-identifiers.constant';

// Every ZPL print answers a file for the label printer, not a page.
export const ZPL_PRINT_TEXT: PrintText = { ...PRINT_TEXT, open: msg('Download the ZPL file') };

export default defineFrontComponent({
  universalIdentifier: ZPL_PRINT_UNIVERSAL_IDENTIFIERS.lotFrontComponent,
  name: 'platform-stock-print-lot-zpl',
  description: 'Prints lot and serial number labels as ZPL.',
  component: makePrintPopup('lotLabelZpl', ZPL_PRINT_TEXT),
});
