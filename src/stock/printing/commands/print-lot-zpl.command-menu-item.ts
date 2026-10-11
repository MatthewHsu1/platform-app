import { makePrintCommand } from 'src/stock/printing/print-commands';
import { ZPL_PRINT_UNIVERSAL_IDENTIFIERS } from 'src/stock/stock-printing-universal-identifiers.constant';
import { STOCK_LOT_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/stock/stock-universal-identifiers.constant';

export default makePrintCommand({
  label: 'Print: Lot/Serial Number (ZPL)',
  objectUniversalIdentifier: STOCK_LOT_OBJECT_UNIVERSAL_IDENTIFIER,
  frontComponentUniversalIdentifier: ZPL_PRINT_UNIVERSAL_IDENTIFIERS.lotFrontComponent,
  commandUniversalIdentifier: ZPL_PRINT_UNIVERSAL_IDENTIFIERS.lotCommand,
});
