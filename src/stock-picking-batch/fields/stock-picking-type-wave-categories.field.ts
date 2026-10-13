import { defineField } from 'twenty-sdk/define';

import { oneToManyField } from 'src/shared/fields';
import {
  PRODUCT_CATEGORY_STOCK_PICKING_TYPE_REL_FIELD_UNIVERSAL_IDENTIFIERS as LINK_IDS,
  PRODUCT_CATEGORY_STOCK_PICKING_TYPE_REL_OBJECT_UNIVERSAL_IDENTIFIER,
  STOCK_PICKING_BATCH_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS as INVERSE_IDS,
} from 'src/stock-picking-batch/stock-picking-batch-universal-identifiers.constant';
import { STOCK_PICKING_TYPE_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/stock/stock-universal-identifiers.constant';

export default defineField({
  ...oneToManyField({
    universalIdentifier: INVERSE_IDS.waveCategories,
    name: 'waveCategories',
    label: 'Wave Product Categories',
    icon: 'IconCategory',
    targetObjectUniversalIdentifier: PRODUCT_CATEGORY_STOCK_PICKING_TYPE_REL_OBJECT_UNIVERSAL_IDENTIFIER,
    targetFieldUniversalIdentifier: LINK_IDS.stockPickingType,
    junctionTargetFieldUniversalIdentifier: LINK_IDS.productCategory,
  }),
  objectUniversalIdentifier: STOCK_PICKING_TYPE_OBJECT_UNIVERSAL_IDENTIFIER,
});
