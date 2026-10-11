import { makePrintCommand } from 'src/stock/printing/print-commands';
import { MORE_PRINT_UNIVERSAL_IDENTIFIERS } from 'src/stock/stock-printing-universal-identifiers.constant';
import { STOCK_PICKING_BATCH_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/stock-picking-batch/stock-picking-batch-universal-identifiers.constant';

export default makePrintCommand({
  label: 'Print: Batch Transfer',
  objectUniversalIdentifier: STOCK_PICKING_BATCH_OBJECT_UNIVERSAL_IDENTIFIER,
  frontComponentUniversalIdentifier: MORE_PRINT_UNIVERSAL_IDENTIFIERS.batchTransferFrontComponent,
  commandUniversalIdentifier: MORE_PRINT_UNIVERSAL_IDENTIFIERS.batchTransferCommand,
});
