import { defineField, FieldType } from 'twenty-sdk/define';

import { PRODUCT_UOM_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/product/product-universal-identifiers.constant';
import { appWritten } from 'src/shared/fields';
import { STOCK_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS } from 'src/stock/stock-universal-identifiers.constant';

// Printed labels are kept on the packaging barcode, newest 60.
export default defineField({
  ...appWritten({
    universalIdentifier: FIELD_IDS.productUomPrintouts,
    name: 'printouts',
    label: 'Printouts',
    icon: 'IconPrinter',
    type: FieldType.FILES,
    universalSettings: { maxNumberOfValues: 60 },
  }),
  objectUniversalIdentifier: PRODUCT_UOM_OBJECT_UNIVERSAL_IDENTIFIER,
});
