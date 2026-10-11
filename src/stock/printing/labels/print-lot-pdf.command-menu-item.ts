import { makePrintCommand } from 'src/stock/printing/print-commands';
import { LABEL_UNIVERSAL_IDENTIFIERS } from 'src/stock/stock-printing-universal-identifiers.constant';
import { STOCK_LOT_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/stock/stock-universal-identifiers.constant';

export default makePrintCommand({
  label: 'Print: Lot/Serial Number (PDF)',
  objectUniversalIdentifier: STOCK_LOT_OBJECT_UNIVERSAL_IDENTIFIER,
  frontComponentUniversalIdentifier: LABEL_UNIVERSAL_IDENTIFIERS.lotPdfFrontComponent,
  commandUniversalIdentifier: LABEL_UNIVERSAL_IDENTIFIERS.lotPdfCommand,
});
