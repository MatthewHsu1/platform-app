import { defineView, ViewType } from 'twenty-sdk/define';

import {
  STOCK_PUTAWAY_RULE_FIELD_UNIVERSAL_IDENTIFIERS,
  STOCK_PUTAWAY_RULE_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/stock/routing-universal-identifiers.constant';
import {
  INVENTORY_LIST_VIEW_UNIVERSAL_IDENTIFIERS as VIEWS,
} from 'src/stock/stock-pages-universal-identifiers.constant';
import { listColumns } from 'src/stock/views/list-columns';
import { STOCK_PUTAWAY_RULE_ALL_FIELDS } from 'src/stock/views/object-fields';

export default defineView({
  universalIdentifier: VIEWS.putawayRules,
  name: 'Putaway Rules',
  objectUniversalIdentifier: STOCK_PUTAWAY_RULE_OBJECT_UNIVERSAL_IDENTIFIER,
  type: ViewType.TABLE,
  icon: 'IconArrowBarToDown',
  position: 0,
  fields: listColumns(VIEWS.putawayRules, [
    STOCK_PUTAWAY_RULE_FIELD_UNIVERSAL_IDENTIFIERS.name,
    STOCK_PUTAWAY_RULE_FIELD_UNIVERSAL_IDENTIFIERS.locationIn,
    STOCK_PUTAWAY_RULE_FIELD_UNIVERSAL_IDENTIFIERS.product,
    STOCK_PUTAWAY_RULE_FIELD_UNIVERSAL_IDENTIFIERS.category,
    STOCK_PUTAWAY_RULE_FIELD_UNIVERSAL_IDENTIFIERS.packageTypes,
    STOCK_PUTAWAY_RULE_FIELD_UNIVERSAL_IDENTIFIERS.locationOut,
    STOCK_PUTAWAY_RULE_FIELD_UNIVERSAL_IDENTIFIERS.sublocation,
    STOCK_PUTAWAY_RULE_FIELD_UNIVERSAL_IDENTIFIERS.storageCategory,
  ], STOCK_PUTAWAY_RULE_ALL_FIELDS),
});
