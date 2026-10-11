import { makePrintCommand } from 'src/stock/printing/print-commands';
import { MORE_PRINT_UNIVERSAL_IDENTIFIERS } from 'src/stock/stock-printing-universal-identifiers.constant';
import { STOCK_QUANT_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/stock/stock-universal-identifiers.constant';

export default makePrintCommand({
  label: 'Print: Count Sheet',
  objectUniversalIdentifier: STOCK_QUANT_OBJECT_UNIVERSAL_IDENTIFIER,
  frontComponentUniversalIdentifier: MORE_PRINT_UNIVERSAL_IDENTIFIERS.countSheetFrontComponent,
  commandUniversalIdentifier: MORE_PRINT_UNIVERSAL_IDENTIFIERS.countSheetCommand,
});
