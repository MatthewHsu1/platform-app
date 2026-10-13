import { defineView, ViewType } from 'twenty-sdk/define';

import {
  PRODUCT_TEMPLATE_FIELD_UNIVERSAL_IDENTIFIERS,
  PRODUCT_TEMPLATE_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/product/product-universal-identifiers.constant';
import { PRODUCT_TEMPLATE_STOCK_FIELDS } from 'src/stock/page-layouts/field-ids';
import {
  INVENTORY_LIST_VIEW_UNIVERSAL_IDENTIFIERS as VIEWS,
} from 'src/stock/stock-pages-universal-identifiers.constant';
import { listColumns, systemField } from 'src/stock/views/list-columns';
import { PRODUCT_TEMPLATE_ALL_FIELDS } from 'src/stock/views/object-fields';

export default defineView({
  universalIdentifier: VIEWS.products,
  name: 'Products',
  objectUniversalIdentifier: PRODUCT_TEMPLATE_OBJECT_UNIVERSAL_IDENTIFIER,
  type: ViewType.TABLE,
  icon: 'IconPackage',
  position: 0,
  fields: listColumns(VIEWS.products, [
    systemField(PRODUCT_TEMPLATE_OBJECT_UNIVERSAL_IDENTIFIER, 'name'),
    PRODUCT_TEMPLATE_FIELD_UNIVERSAL_IDENTIFIERS.isFavorite,
    PRODUCT_TEMPLATE_FIELD_UNIVERSAL_IDENTIFIERS.defaultCode,
    PRODUCT_TEMPLATE_FIELD_UNIVERSAL_IDENTIFIERS.listPrice,
    PRODUCT_TEMPLATE_FIELD_UNIVERSAL_IDENTIFIERS.standardPrice,
    PRODUCT_TEMPLATE_STOCK_FIELDS.qtyAvailable,
    PRODUCT_TEMPLATE_STOCK_FIELDS.virtualAvailable,
    PRODUCT_TEMPLATE_FIELD_UNIVERSAL_IDENTIFIERS.uom,
  ], PRODUCT_TEMPLATE_ALL_FIELDS),
});
