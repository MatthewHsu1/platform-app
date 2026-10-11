import { makePrintCommand } from 'src/stock/printing/print-commands';
import { LABEL_UNIVERSAL_IDENTIFIERS } from 'src/stock/stock-printing-universal-identifiers.constant';
import { STOCK_PICKING_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/stock/stock-universal-identifiers.constant';

export default makePrintCommand({
  label: 'Print: Labels',
  objectUniversalIdentifier: STOCK_PICKING_OBJECT_UNIVERSAL_IDENTIFIER,
  frontComponentUniversalIdentifier: LABEL_UNIVERSAL_IDENTIFIERS.chooseTypeOfLabels,
  commandUniversalIdentifier: LABEL_UNIVERSAL_IDENTIFIERS.pickingCommand,
});
