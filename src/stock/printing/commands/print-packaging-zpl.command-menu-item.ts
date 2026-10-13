import { defineCommandMenuItem } from 'twenty-sdk/define';

import { makePrintCommand } from 'src/stock/printing/print-commands';
import { ZPL_PRINT_UNIVERSAL_IDENTIFIERS } from 'src/stock/stock-printing-universal-identifiers.constant';
import { PRODUCT_UOM_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/product/product-universal-identifiers.constant';

export default defineCommandMenuItem(
  makePrintCommand({
    label: 'Print: Packaging Barcodes (ZPL)',
    objectUniversalIdentifier: PRODUCT_UOM_OBJECT_UNIVERSAL_IDENTIFIER,
    frontComponentUniversalIdentifier: ZPL_PRINT_UNIVERSAL_IDENTIFIERS.packagingFrontComponent,
    commandUniversalIdentifier: ZPL_PRINT_UNIVERSAL_IDENTIFIERS.packagingCommand,
  }),
);
