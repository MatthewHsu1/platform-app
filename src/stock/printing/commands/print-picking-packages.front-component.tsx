import { defineFrontComponent } from 'twenty-sdk/define';
import { msg } from 'twenty-sdk/front-component';

import { PRINT_TEXT } from 'src/stock/printing/commands/print-picking-ready.front-component';
import { makePrintPopup } from 'src/stock/printing/print-popup';
import { type PrintText } from 'src/stock/printing/types/print-text.type';
import { MORE_PRINT_UNIVERSAL_IDENTIFIERS } from 'src/stock/stock-printing-universal-identifiers.constant';

export const PICKING_PACKAGES_TEXT: PrintText = { ...PRINT_TEXT, open: msg('Open Packages') };

export default defineFrontComponent({
  universalIdentifier: MORE_PRINT_UNIVERSAL_IDENTIFIERS.pickingPackagesFrontComponent,
  name: 'platform-stock-print-picking-packages',
  description: 'Prints the packages of the selected transfers with their contents.',
  component: makePrintPopup('pickingPackages', PICKING_PACKAGES_TEXT),
});
