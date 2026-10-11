import { defineView } from 'twenty-sdk/define';

import {
  STOCK_PUTAWAY_RULE_FIELD_UNIVERSAL_IDENTIFIERS,
  STOCK_PUTAWAY_RULE_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/stock/routing-universal-identifiers.constant';
import {
  STOCK_TABLE_WIDGET_VIEW_UNIVERSAL_IDENTIFIERS as VIEWS,
} from 'src/stock/stock-pages-universal-identifiers.constant';
import { STOCK_PUTAWAY_RULE_ALL_FIELDS } from 'src/stock/views/object-fields';
import { tableWidgetView } from 'src/stock/views/table-widget-view';

export default defineView(
  tableWidgetView({
    universalIdentifier: VIEWS.locationPutawayRules,
    name: 'Location putaway rules',
    objectUniversalIdentifier: STOCK_PUTAWAY_RULE_OBJECT_UNIVERSAL_IDENTIFIER,
    visible: [
      STOCK_PUTAWAY_RULE_FIELD_UNIVERSAL_IDENTIFIERS.name,
      STOCK_PUTAWAY_RULE_FIELD_UNIVERSAL_IDENTIFIERS.product,
      STOCK_PUTAWAY_RULE_FIELD_UNIVERSAL_IDENTIFIERS.category,
      STOCK_PUTAWAY_RULE_FIELD_UNIVERSAL_IDENTIFIERS.packageTypes,
      STOCK_PUTAWAY_RULE_FIELD_UNIVERSAL_IDENTIFIERS.locationOut,
      STOCK_PUTAWAY_RULE_FIELD_UNIVERSAL_IDENTIFIERS.sublocation,
      STOCK_PUTAWAY_RULE_FIELD_UNIVERSAL_IDENTIFIERS.storageCategory,
    ],
    all: STOCK_PUTAWAY_RULE_ALL_FIELDS,
    parentField: STOCK_PUTAWAY_RULE_FIELD_UNIVERSAL_IDENTIFIERS.locationIn,
  }),
);
