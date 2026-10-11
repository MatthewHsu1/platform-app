import { PRODUCT_PRODUCT_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/product/product-universal-identifiers.constant';
import { makePrintCommand } from 'src/stock/printing/print-commands';
import { LABEL_UNIVERSAL_IDENTIFIERS } from 'src/stock/stock-printing-universal-identifiers.constant';

export default makePrintCommand({
  label: 'Print Labels',
  objectUniversalIdentifier: PRODUCT_PRODUCT_OBJECT_UNIVERSAL_IDENTIFIER,
  frontComponentUniversalIdentifier: LABEL_UNIVERSAL_IDENTIFIERS.chooseLabelsLayout,
  commandUniversalIdentifier: LABEL_UNIVERSAL_IDENTIFIERS.productProductCommand,
});
