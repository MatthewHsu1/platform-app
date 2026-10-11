import { makePrintCommand } from 'src/stock/printing/print-commands';
import { PICKING_PRINT_UNIVERSAL_IDENTIFIERS } from 'src/stock/stock-printing-universal-identifiers.constant';
import { STOCK_PICKING_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/stock/stock-universal-identifiers.constant';

export default makePrintCommand({
  label: 'Print: Delivery Slip',
  objectUniversalIdentifier: STOCK_PICKING_OBJECT_UNIVERSAL_IDENTIFIER,
  frontComponentUniversalIdentifier: PICKING_PRINT_UNIVERSAL_IDENTIFIERS.deliverySlipFrontComponent,
  commandUniversalIdentifier: PICKING_PRINT_UNIVERSAL_IDENTIFIERS.deliverySlipCommand,
});
