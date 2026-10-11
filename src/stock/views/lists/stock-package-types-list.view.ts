import { defineView, ViewType } from 'twenty-sdk/define';

import {
  STOCK_PACKAGE_TYPE_FIELD_UNIVERSAL_IDENTIFIERS,
  STOCK_PACKAGE_TYPE_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/stock/routing-universal-identifiers.constant';
import {
  INVENTORY_LIST_VIEW_UNIVERSAL_IDENTIFIERS as VIEWS,
} from 'src/stock/stock-pages-universal-identifiers.constant';
import { listColumns } from 'src/stock/views/list-columns';
import { STOCK_PACKAGE_TYPE_ALL_FIELDS } from 'src/stock/views/object-fields';

export default defineView({
  universalIdentifier: VIEWS.packageTypes,
  name: 'Package Types',
  objectUniversalIdentifier: STOCK_PACKAGE_TYPE_OBJECT_UNIVERSAL_IDENTIFIER,
  type: ViewType.TABLE,
  icon: 'IconPackage',
  position: 0,
  fields: listColumns(VIEWS.packageTypes, [
    STOCK_PACKAGE_TYPE_FIELD_UNIVERSAL_IDENTIFIERS.name,
    STOCK_PACKAGE_TYPE_FIELD_UNIVERSAL_IDENTIFIERS.height,
    STOCK_PACKAGE_TYPE_FIELD_UNIVERSAL_IDENTIFIERS.width,
    STOCK_PACKAGE_TYPE_FIELD_UNIVERSAL_IDENTIFIERS.packagingLength,
    STOCK_PACKAGE_TYPE_FIELD_UNIVERSAL_IDENTIFIERS.maxWeight,
  ], STOCK_PACKAGE_TYPE_ALL_FIELDS),
});
