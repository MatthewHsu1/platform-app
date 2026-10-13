import { defineCommandMenuItem } from 'twenty-sdk/define';

import { makePrintCommand } from 'src/stock/printing/print-commands';
import { MORE_PRINT_UNIVERSAL_IDENTIFIERS } from 'src/stock/stock-printing-universal-identifiers.constant';
import { STOCK_LOCATION_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/stock/stock-universal-identifiers.constant';

export default defineCommandMenuItem(
  makePrintCommand({
    label: 'Print: Location Barcode',
    objectUniversalIdentifier: STOCK_LOCATION_OBJECT_UNIVERSAL_IDENTIFIER,
    frontComponentUniversalIdentifier: MORE_PRINT_UNIVERSAL_IDENTIFIERS.locationBarcodeFrontComponent,
    commandUniversalIdentifier: MORE_PRINT_UNIVERSAL_IDENTIFIERS.locationBarcodeCommand,
  }),
);
