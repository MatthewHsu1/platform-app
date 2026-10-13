import { defineFrontComponent } from 'twenty-sdk/define';

import { PACKAGE_CONTENTS_TEXT } from 'src/stock/printing/commands/print-package-contents.front-component';
import { makePrintPopup } from 'src/stock/printing/print-popup';
import { MORE_PRINT_UNIVERSAL_IDENTIFIERS } from 'src/stock/stock-printing-universal-identifiers.constant';

export default defineFrontComponent({
  universalIdentifier: MORE_PRINT_UNIVERSAL_IDENTIFIERS.packageHistoryContentsFrontComponent,
  name: 'platform-stock-print-package-history-contents',
  description: 'Prints the barcode and contents of the packages of the selected package history rows.',
  component: makePrintPopup('packageBarcodeContents', PACKAGE_CONTENTS_TEXT),
});
