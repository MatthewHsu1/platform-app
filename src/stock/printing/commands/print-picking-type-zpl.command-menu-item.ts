import { makePrintCommand } from 'src/stock/printing/print-commands';
import { ZPL_PRINT_UNIVERSAL_IDENTIFIERS } from 'src/stock/stock-printing-universal-identifiers.constant';
import { STOCK_PICKING_TYPE_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/stock/stock-universal-identifiers.constant';

export default makePrintCommand({
  label: 'Print: Operation type (ZPL)',
  objectUniversalIdentifier: STOCK_PICKING_TYPE_OBJECT_UNIVERSAL_IDENTIFIER,
  frontComponentUniversalIdentifier: ZPL_PRINT_UNIVERSAL_IDENTIFIERS.pickingTypeFrontComponent,
  commandUniversalIdentifier: ZPL_PRINT_UNIVERSAL_IDENTIFIERS.pickingTypeCommand,
});
