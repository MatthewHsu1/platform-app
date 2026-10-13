import { defineFrontComponent } from 'twenty-sdk/define';
import { msg } from 'twenty-sdk/front-component';

import { makePrintPopup } from 'src/stock/printing/print-popup';
import { type PrintText } from 'src/stock/printing/types/print-text.type';
import { PICKING_PRINT_UNIVERSAL_IDENTIFIERS } from 'src/stock/stock-printing-universal-identifiers.constant';

export const PRINT_TEXT: Omit<PrintText, 'open'> = {
  printing: msg('Preparing the print…'),
  failed: msg('Could not print.'),
  ready: msg('Ready to print'),
  close: msg('Close'),
};

export const PICKING_OPERATIONS_TEXT: PrintText = { ...PRINT_TEXT, open: msg('Open Picking Operations') };

// The print route answers these texts in the user's language. The translation
// extractor reads only front-component files, so they are listed here to reach
// the catalog; each must match its source text exactly.
export const PRINT_ROUTE_TEXTS = [
  msg('Choose what to print.'),
  msg('Nothing to print.'),
  msg('These print options are not valid.'),
  msg('Your time zone is not known. Check the time zone in your settings and print again.'),
  msg('Choose one record to print this report.'),
  msg('Up to {max} unfolded or chosen lines can be printed at once. Fold or untick some and print again.'),
];

export default defineFrontComponent({
  universalIdentifier: PICKING_PRINT_UNIVERSAL_IDENTIFIERS.printReadyFrontComponent,
  name: 'platform-stock-print-picking-ready',
  description: 'Prints the picking operations of ready transfers and marks them printed.',
  component: makePrintPopup('pickingOperations', PICKING_OPERATIONS_TEXT),
});
