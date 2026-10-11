import { defineView, ViewFilterOperand, ViewType } from 'twenty-sdk/define';

import { orderpointViewFields } from 'src/stock/orderpoint/views/orderpoint-view-fields';
import { ORDERPOINT_TRIGGER } from 'src/stock/stock-options.constant';
import {
  ORDERPOINT_VIEW_UNIVERSAL_IDENTIFIERS,
  REORDERING_RULES_VIEW_PART_UNIVERSAL_IDENTIFIERS as PART_IDS,
  STOCK_WAREHOUSE_ORDERPOINT_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
  STOCK_WAREHOUSE_ORDERPOINT_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/stock/stock-universal-identifiers.constant';

// Active automatic rules.
export default defineView({
  universalIdentifier: ORDERPOINT_VIEW_UNIVERSAL_IDENTIFIERS.reorderingRules,
  name: 'Reordering Rules',
  objectUniversalIdentifier: STOCK_WAREHOUSE_ORDERPOINT_OBJECT_UNIVERSAL_IDENTIFIER,
  type: ViewType.TABLE,
  icon: 'IconRepeat',
  position: 2,
  fields: orderpointViewFields(ORDERPOINT_VIEW_UNIVERSAL_IDENTIFIERS.reorderingRules, PART_IDS, [
    'product',
    'location',
    'qtyOnHand',
    'qtyForecast',
    'trigger',
    'productMinQty',
    'productMaxQty',
    'qtyToOrder',
  ]),
  filters: [
    {
      universalIdentifier: PART_IDS.filterTrigger,
      fieldMetadataUniversalIdentifier: FIELD_IDS.trigger,
      operand: ViewFilterOperand.IS,
      value: [ORDERPOINT_TRIGGER.AUTO],
    },
    {
      universalIdentifier: PART_IDS.filterActive,
      fieldMetadataUniversalIdentifier: FIELD_IDS.active,
      operand: ViewFilterOperand.IS,
      value: 'true',
    },
  ],
});
