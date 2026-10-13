import { defineCommandMenuItem } from 'twenty-sdk/define';

import { makePrintCommand } from 'src/stock/printing/print-commands';
import { PICKING_PRINT_UNIVERSAL_IDENTIFIERS } from 'src/stock/stock-printing-universal-identifiers.constant';
import { STOCK_PICKING_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/stock/stock-universal-identifiers.constant';

export default defineCommandMenuItem(
  makePrintCommand({
    label: 'Print: Picking Operations',
    objectUniversalIdentifier: STOCK_PICKING_OBJECT_UNIVERSAL_IDENTIFIER,
    frontComponentUniversalIdentifier: PICKING_PRINT_UNIVERSAL_IDENTIFIERS.pickingOperationsFrontComponent,
    commandUniversalIdentifier: PICKING_PRINT_UNIVERSAL_IDENTIFIERS.pickingOperationsCommand,
  }),
);
