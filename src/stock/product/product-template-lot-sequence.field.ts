import { defineField, OnDeleteAction } from 'twenty-sdk/define';

import { IR_SEQUENCE_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/base/base-universal-identifiers.constant';
import { PRODUCT_TEMPLATE_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/product/product-universal-identifiers.constant';
import { manyToOneField } from 'src/shared/fields';
import { STOCK_TRACKING_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS } from 'src/stock/stock-universal-identifiers.constant';

export default defineField({
  ...manyToOneField({
    universalIdentifier: FIELD_IDS.templateLotSequence,
    name: 'lotSequence',
    label: 'Serial/Lot Numbers Sequence',
    icon: 'IconListNumbers',
    onDelete: OnDeleteAction.SET_NULL,
    targetObjectUniversalIdentifier: IR_SEQUENCE_OBJECT_UNIVERSAL_IDENTIFIER,
    targetFieldUniversalIdentifier: FIELD_IDS.irSequenceProductTemplates,
  }),
  objectUniversalIdentifier: PRODUCT_TEMPLATE_OBJECT_UNIVERSAL_IDENTIFIER,
});
