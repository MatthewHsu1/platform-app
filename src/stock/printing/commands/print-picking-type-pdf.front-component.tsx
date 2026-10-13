import { defineFrontComponent } from 'twenty-sdk/define';
import { msg } from 'twenty-sdk/front-component';

import { PRINT_TEXT } from 'src/stock/printing/commands/print-picking-ready.front-component';
import { makePrintPopup } from 'src/stock/printing/print-popup';
import { type PrintText } from 'src/stock/printing/types/print-text.type';
import { MORE_PRINT_UNIVERSAL_IDENTIFIERS } from 'src/stock/stock-printing-universal-identifiers.constant';

export const PICKING_TYPE_PDF_TEXT: PrintText = { ...PRINT_TEXT, open: msg('Open the operation type labels') };

export default defineFrontComponent({
  universalIdentifier: MORE_PRINT_UNIVERSAL_IDENTIFIERS.pickingTypePdfFrontComponent,
  name: 'platform-stock-print-picking-type-pdf',
  description: 'Prints the barcodes of the selected operation types on a label sheet.',
  component: makePrintPopup('pickingTypeLabelPdf', PICKING_TYPE_PDF_TEXT),
});
