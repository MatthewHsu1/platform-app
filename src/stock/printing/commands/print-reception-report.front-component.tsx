import { defineFrontComponent } from 'twenty-sdk/define';
import { msg } from 'twenty-sdk/front-component';

import { PRINT_TEXT } from 'src/stock/printing/commands/print-picking-ready.front-component';
import { makePrintPopup } from 'src/stock/printing/print-popup';
import { type PrintText } from 'src/stock/printing/types/print-text.type';
import { MORE_PRINT_UNIVERSAL_IDENTIFIERS } from 'src/stock/stock-printing-universal-identifiers.constant';

export const RECEPTION_REPORT_TEXT: PrintText = { ...PRINT_TEXT, open: msg('Open Reception Report') };

export default defineFrontComponent({
  universalIdentifier: MORE_PRINT_UNIVERSAL_IDENTIFIERS.receptionReportFrontComponent,
  name: 'platform-stock-print-reception-report',
  description: 'Prints the reception report of the selected transfers.',
  component: makePrintPopup('receptionReport', RECEPTION_REPORT_TEXT),
});
