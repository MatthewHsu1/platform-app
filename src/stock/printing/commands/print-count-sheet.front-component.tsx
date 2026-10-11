import { defineFrontComponent } from 'twenty-sdk/define';
import { msg } from 'twenty-sdk/front-component';

import { PRINT_TEXT } from 'src/stock/printing/commands/print-picking-ready.front-component';
import { makePrintPopup } from 'src/stock/printing/print-popup';
import { type PrintText } from 'src/stock/printing/types/print-text.type';
import { MORE_PRINT_UNIVERSAL_IDENTIFIERS } from 'src/stock/stock-printing-universal-identifiers.constant';

export const COUNT_SHEET_TEXT: PrintText = { ...PRINT_TEXT, open: msg('Open Count Sheet') };

export default defineFrontComponent({
  universalIdentifier: MORE_PRINT_UNIVERSAL_IDENTIFIERS.countSheetFrontComponent,
  name: 'platform-stock-print-count-sheet',
  description: 'Prints the count sheet of the selected stock levels.',
  component: makePrintPopup('countSheet', COUNT_SHEET_TEXT),
});
