import { defineFrontComponent } from 'twenty-sdk/define';
import { msg } from 'twenty-sdk/front-component';

import { PRINT_TEXT } from 'src/stock/printing/commands/print-picking-ready.front-component';
import { makePrintPopup } from 'src/stock/printing/print-popup';
import { type PrintText } from 'src/stock/printing/types/print-text.type';
import { MORE_PRINT_UNIVERSAL_IDENTIFIERS } from 'src/stock/stock-printing-universal-identifiers.constant';

export const LOCATION_BARCODE_TEXT: PrintText = { ...PRINT_TEXT, open: msg('Open the location barcodes') };

export default defineFrontComponent({
  universalIdentifier: MORE_PRINT_UNIVERSAL_IDENTIFIERS.locationBarcodeFrontComponent,
  name: 'platform-stock-print-location-barcode',
  description: 'Prints the barcodes of the selected locations on a label sheet.',
  component: makePrintPopup('locationBarcode', LOCATION_BARCODE_TEXT),
});
