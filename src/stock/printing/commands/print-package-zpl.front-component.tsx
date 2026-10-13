import { defineFrontComponent } from 'twenty-sdk/define';

import { ZPL_PRINT_TEXT } from 'src/stock/printing/commands/print-lot-zpl.front-component';
import { makePrintPopup } from 'src/stock/printing/print-popup';
import { ZPL_PRINT_UNIVERSAL_IDENTIFIERS } from 'src/stock/stock-printing-universal-identifiers.constant';

export default defineFrontComponent({
  universalIdentifier: ZPL_PRINT_UNIVERSAL_IDENTIFIERS.packageFrontComponent,
  name: 'platform-stock-print-package-zpl',
  description: 'Prints package barcode labels as ZPL.',
  component: makePrintPopup('packageBarcodeZpl', ZPL_PRINT_TEXT),
});
