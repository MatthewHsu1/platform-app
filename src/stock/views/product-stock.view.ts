import { defineView, ViewSortDirection, ViewType } from 'twenty-sdk/define';

import {
  PRODUCT_PRODUCT_FIELD_UNIVERSAL_IDENTIFIERS as VARIANT,
  PRODUCT_PRODUCT_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/product/product-universal-identifiers.constant';
import { PRODUCT_PRODUCT_STOCK_FIELDS as F, PRODUCT_TEMPLATE_STOCK_FIELDS } from 'src/stock/page-layouts/field-ids';
import { STOCK_VIEW_UNIVERSAL_IDENTIFIERS as VIEWS } from 'src/stock/stock-pages-universal-identifiers.constant';
import { listColumns } from 'src/stock/views/list-columns';
import { PRODUCT_PRODUCT_ALL_FIELDS } from 'src/stock/views/object-fields';
import { relatedIs, sortBy } from 'src/stock/views/view-helpers';

const VIEW = VIEWS.productStock;

// The unit is the template's; a variant has no unit column of its own, so the
// list ends with the quantities.
export default defineView({
  universalIdentifier: VIEW,
  name: 'Stock',
  objectUniversalIdentifier: PRODUCT_PRODUCT_OBJECT_UNIVERSAL_IDENTIFIER,
  type: ViewType.TABLE,
  icon: 'IconBuildingWarehouse',
  position: 1,
  filters: [relatedIs(VIEW, VARIANT.productTmpl, PRODUCT_TEMPLATE_STOCK_FIELDS.isStorable, 'true')],
  // Favourites live on the template, which a view cannot sort a variant by.
  sorts: [sortBy(VIEW, VARIANT.defaultCode, ViewSortDirection.ASC)],
  fields: listColumns(
    VIEW,
    [VARIANT.name, F.qtyAvailable, F.freeQty, F.incomingQty, F.outgoingQty],
    PRODUCT_PRODUCT_ALL_FIELDS,
  ),
});
