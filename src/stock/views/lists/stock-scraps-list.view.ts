import { defineView, ViewType } from 'twenty-sdk/define';

import {
  INVENTORY_LIST_VIEW_UNIVERSAL_IDENTIFIERS as VIEWS,
} from 'src/stock/stock-pages-universal-identifiers.constant';
import {
  STOCK_SCRAP_FIELD_UNIVERSAL_IDENTIFIERS,
  STOCK_SCRAP_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/stock/stock-universal-identifiers.constant';
import { listColumns } from 'src/stock/views/list-columns';
import { STOCK_SCRAP_ALL_FIELDS } from 'src/stock/views/object-fields';

export default defineView({
  universalIdentifier: VIEWS.scrap,
  name: 'Scrap Orders',
  objectUniversalIdentifier: STOCK_SCRAP_OBJECT_UNIVERSAL_IDENTIFIER,
  type: ViewType.TABLE,
  icon: 'IconTrash',
  position: 0,
  fields: listColumns(VIEWS.scrap, [
    STOCK_SCRAP_FIELD_UNIVERSAL_IDENTIFIERS.name,
    STOCK_SCRAP_FIELD_UNIVERSAL_IDENTIFIERS.dateDone,
    STOCK_SCRAP_FIELD_UNIVERSAL_IDENTIFIERS.product,
    STOCK_SCRAP_FIELD_UNIVERSAL_IDENTIFIERS.scrapQty,
    STOCK_SCRAP_FIELD_UNIVERSAL_IDENTIFIERS.productUom,
    STOCK_SCRAP_FIELD_UNIVERSAL_IDENTIFIERS.location,
    STOCK_SCRAP_FIELD_UNIVERSAL_IDENTIFIERS.scrapLocation,
    STOCK_SCRAP_FIELD_UNIVERSAL_IDENTIFIERS.state,
  ], STOCK_SCRAP_ALL_FIELDS),
});
