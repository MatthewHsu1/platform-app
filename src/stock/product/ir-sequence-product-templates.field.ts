import { defineField } from 'twenty-sdk/define';

import { IR_SEQUENCE_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/base/base-universal-identifiers.constant';
import { PRODUCT_TEMPLATE_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/product/product-universal-identifiers.constant';
import { oneToManyField } from 'src/shared/fields';
import { STOCK_TRACKING_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS } from 'src/stock/stock-universal-identifiers.constant';

export default defineField({
  ...oneToManyField({
    universalIdentifier: FIELD_IDS.irSequenceProductTemplates,
    name: 'productTemplates',
    label: 'Products',
    icon: 'IconPackage',
    targetObjectUniversalIdentifier: PRODUCT_TEMPLATE_OBJECT_UNIVERSAL_IDENTIFIER,
    targetFieldUniversalIdentifier: FIELD_IDS.templateLotSequence,
  }),
  objectUniversalIdentifier: IR_SEQUENCE_OBJECT_UNIVERSAL_IDENTIFIER,
});
