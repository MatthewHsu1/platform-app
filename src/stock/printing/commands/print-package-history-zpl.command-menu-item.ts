import { defineCommandMenuItem } from 'twenty-sdk/define';

import { makePrintCommand } from 'src/stock/printing/print-commands';
import { ZPL_PRINT_UNIVERSAL_IDENTIFIERS } from 'src/stock/stock-printing-universal-identifiers.constant';
import { STOCK_PACKAGE_HISTORY_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/stock/stock-universal-identifiers.constant';

export default defineCommandMenuItem(
  makePrintCommand({
    label: 'Print: Package Barcode (ZPL)',
    objectUniversalIdentifier: STOCK_PACKAGE_HISTORY_OBJECT_UNIVERSAL_IDENTIFIER,
    frontComponentUniversalIdentifier: ZPL_PRINT_UNIVERSAL_IDENTIFIERS.packageHistoryFrontComponent,
    commandUniversalIdentifier: ZPL_PRINT_UNIVERSAL_IDENTIFIERS.packageHistoryCommand,
  }),
);
