import { defineFrontComponent } from 'twenty-sdk/define';

import { ZPL_PRINT_TEXT } from 'src/stock/printing/commands/print-lot-zpl.front-component';
import { makePrintPopup } from 'src/stock/printing/print-popup';
import { ZPL_PRINT_UNIVERSAL_IDENTIFIERS } from 'src/stock/stock-printing-universal-identifiers.constant';

export default defineFrontComponent({
  universalIdentifier: ZPL_PRINT_UNIVERSAL_IDENTIFIERS.packagingFrontComponent,
  name: 'platform-stock-print-packaging-zpl',
  description: 'Prints packaging barcode labels as ZPL.',
  component: makePrintPopup('packagingBarcodeZpl', ZPL_PRINT_TEXT),
});
