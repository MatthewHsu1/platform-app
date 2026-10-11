import { defineView, ViewSortDirection, ViewType } from 'twenty-sdk/define';

import { PACKAGE_FIELDS } from 'src/stock/page-layouts/field-ids';
import {
  INVENTORY_LIST_VIEW_UNIVERSAL_IDENTIFIERS as VIEWS,
} from 'src/stock/stock-pages-universal-identifiers.constant';
import { STOCK_PACKAGE_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/stock/stock-universal-identifiers.constant';
import { listColumns, viewPartId } from 'src/stock/views/list-columns';
import { STOCK_PACKAGE_ALL_FIELDS } from 'src/stock/views/object-fields';

export default defineView({
  universalIdentifier: VIEWS.packages,
  name: 'Packages',
  objectUniversalIdentifier: STOCK_PACKAGE_OBJECT_UNIVERSAL_IDENTIFIER,
  type: ViewType.TABLE,
  icon: 'IconPackage',
  position: 0,
  fields: listColumns(VIEWS.packages, [
    PACKAGE_FIELDS.name,
    PACKAGE_FIELDS.parentPackage,
    PACKAGE_FIELDS.packageType,
    PACKAGE_FIELDS.location,
  ], STOCK_PACKAGE_ALL_FIELDS),
  sorts: [
    {
      universalIdentifier: viewPartId(VIEWS.packages, 'sort', PACKAGE_FIELDS.name),
      fieldMetadataUniversalIdentifier: PACKAGE_FIELDS.name,
      direction: ViewSortDirection.ASC,
    },
  ],
});
