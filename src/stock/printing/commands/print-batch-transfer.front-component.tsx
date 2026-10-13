import { defineFrontComponent } from 'twenty-sdk/define';
import { msg } from 'twenty-sdk/front-component';

import { PRINT_TEXT } from 'src/stock/printing/commands/print-picking-ready.front-component';
import { makePrintPopup } from 'src/stock/printing/print-popup';
import { type PrintText } from 'src/stock/printing/types/print-text.type';
import { MORE_PRINT_UNIVERSAL_IDENTIFIERS } from 'src/stock/stock-printing-universal-identifiers.constant';

export const BATCH_TRANSFER_TEXT: PrintText = { ...PRINT_TEXT, open: msg('Open Batch Transfer') };

export default defineFrontComponent({
  universalIdentifier: MORE_PRINT_UNIVERSAL_IDENTIFIERS.batchTransferFrontComponent,
  name: 'platform-stock-print-batch-transfer',
  description: 'Prints the selected batch transfers.',
  component: makePrintPopup('batchTransfer', BATCH_TRANSFER_TEXT),
});
