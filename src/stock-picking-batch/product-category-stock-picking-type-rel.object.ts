import { defineObject } from 'twenty-sdk/define';

import { PRODUCT_CATEGORY_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/product/product-universal-identifiers.constant';
import {
  PRODUCT_CATEGORY_STOCK_PICKING_TYPE_REL_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
  PRODUCT_CATEGORY_STOCK_PICKING_TYPE_REL_OBJECT_UNIVERSAL_IDENTIFIER,
  STOCK_PICKING_BATCH_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS as INVERSE_IDS,
} from 'src/stock-picking-batch/stock-picking-batch-universal-identifiers.constant';
import { linkObjectConfig } from 'src/stock/route/link-definitions';
import { STOCK_PICKING_TYPE_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/stock/stock-universal-identifiers.constant';

export default defineObject(
  linkObjectConfig({
    universalIdentifier: PRODUCT_CATEGORY_STOCK_PICKING_TYPE_REL_OBJECT_UNIVERSAL_IDENTIFIER,
    nameSingular: 'productCategoryStockPickingTypeRel',
    namePlural: 'productCategoryStockPickingTypeRels',
    labelSingular: 'Wave category link',
    labelPlural: 'Wave category links',
    description: 'A product category an operation type groups waves by',
    sides: [
      {
        universalIdentifier: FIELD_IDS.stockPickingType,
        name: 'stockPickingType',
        label: 'Operation Type',
        icon: 'IconTransfer',
        targetObjectUniversalIdentifier: STOCK_PICKING_TYPE_OBJECT_UNIVERSAL_IDENTIFIER,
        targetFieldUniversalIdentifier: INVERSE_IDS.waveCategories,
      },
      {
        universalIdentifier: FIELD_IDS.productCategory,
        name: 'productCategory',
        label: 'Product Category',
        icon: 'IconCategory',
        targetObjectUniversalIdentifier: PRODUCT_CATEGORY_OBJECT_UNIVERSAL_IDENTIFIER,
        targetFieldUniversalIdentifier: INVERSE_IDS.productCategoryWaveLinks,
      },
    ],
  }),
);
