import { defineView, ViewType } from 'twenty-sdk/define';

import {
  STOCK_RULE_FIELD_UNIVERSAL_IDENTIFIERS,
  STOCK_RULE_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/stock/routing-universal-identifiers.constant';
import {
  INVENTORY_LIST_VIEW_UNIVERSAL_IDENTIFIERS as VIEWS,
} from 'src/stock/stock-pages-universal-identifiers.constant';
import { listColumns } from 'src/stock/views/list-columns';
import { STOCK_RULE_ALL_FIELDS } from 'src/stock/views/object-fields';

export default defineView({
  universalIdentifier: VIEWS.rules,
  name: 'Rules',
  objectUniversalIdentifier: STOCK_RULE_OBJECT_UNIVERSAL_IDENTIFIER,
  type: ViewType.TABLE,
  icon: 'IconArrowsSplit',
  position: 0,
  fields: listColumns(VIEWS.rules, [
    STOCK_RULE_FIELD_UNIVERSAL_IDENTIFIERS.name,
    STOCK_RULE_FIELD_UNIVERSAL_IDENTIFIERS.action,
    STOCK_RULE_FIELD_UNIVERSAL_IDENTIFIERS.locationSrc,
    STOCK_RULE_FIELD_UNIVERSAL_IDENTIFIERS.locationDest,
    STOCK_RULE_FIELD_UNIVERSAL_IDENTIFIERS.route,
  ], STOCK_RULE_ALL_FIELDS),
});
