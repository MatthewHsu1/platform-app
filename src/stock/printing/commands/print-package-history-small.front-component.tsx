import { defineFrontComponent } from 'twenty-sdk/define';

import { PACKAGE_SMALL_TEXT } from 'src/stock/printing/commands/print-package-small.front-component';
import { makePrintPopup } from 'src/stock/printing/print-popup';
import { MORE_PRINT_UNIVERSAL_IDENTIFIERS } from 'src/stock/stock-printing-universal-identifiers.constant';

export default defineFrontComponent({
  universalIdentifier: MORE_PRINT_UNIVERSAL_IDENTIFIERS.packageHistorySmallFrontComponent,
  name: 'platform-stock-print-package-history-small',
  description: 'Prints the barcode of the packages of the selected package history rows.',
  component: makePrintPopup('packageBarcodeSmall', PACKAGE_SMALL_TEXT),
});
