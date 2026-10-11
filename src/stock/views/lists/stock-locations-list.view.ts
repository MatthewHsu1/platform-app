import { defineView, ViewType } from 'twenty-sdk/define';

import { LOCATION_FIELDS } from 'src/stock/page-layouts/field-ids';
import {
  INVENTORY_LIST_VIEW_UNIVERSAL_IDENTIFIERS as VIEWS,
} from 'src/stock/stock-pages-universal-identifiers.constant';
import { STOCK_LOCATION_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/stock/stock-universal-identifiers.constant';
import { listColumns } from 'src/stock/views/list-columns';
import { STOCK_LOCATION_ALL_FIELDS } from 'src/stock/views/object-fields';

export default defineView({
  universalIdentifier: VIEWS.locations,
  name: 'Locations',
  objectUniversalIdentifier: STOCK_LOCATION_OBJECT_UNIVERSAL_IDENTIFIER,
  type: ViewType.TABLE,
  icon: 'IconMapPin',
  position: 0,
  fields: listColumns(VIEWS.locations, [
    LOCATION_FIELDS.name,
    LOCATION_FIELDS.completeName,
    LOCATION_FIELDS.usage,
    LOCATION_FIELDS.storageCategory,
  ], STOCK_LOCATION_ALL_FIELDS),
});
