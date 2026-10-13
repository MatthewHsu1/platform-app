import { defineCommandMenuItem } from 'twenty-sdk/define';

import { makePrintCommand } from 'src/stock/printing/print-commands';
import { MORE_PRINT_UNIVERSAL_IDENTIFIERS } from 'src/stock/stock-printing-universal-identifiers.constant';
import { STOCK_PACKAGE_HISTORY_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/stock/stock-universal-identifiers.constant';

export default defineCommandMenuItem(
  makePrintCommand({
    label: 'Print: Package Barcode (PDF)',
    objectUniversalIdentifier: STOCK_PACKAGE_HISTORY_OBJECT_UNIVERSAL_IDENTIFIER,
    frontComponentUniversalIdentifier: MORE_PRINT_UNIVERSAL_IDENTIFIERS.packageHistorySmallFrontComponent,
    commandUniversalIdentifier: MORE_PRINT_UNIVERSAL_IDENTIFIERS.packageHistorySmallCommand,
  }),
);
