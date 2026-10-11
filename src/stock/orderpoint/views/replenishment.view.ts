import { defineView, ViewFilterGroupLogicalOperator, ViewFilterOperand, ViewType } from 'twenty-sdk/define';

import { orderpointViewFields } from 'src/stock/orderpoint/views/orderpoint-view-fields';
import { ORDERPOINT_TRIGGER } from 'src/stock/stock-options.constant';
import {
  ORDERPOINT_VIEW_UNIVERSAL_IDENTIFIERS,
  REPLENISHMENT_VIEW_PART_UNIVERSAL_IDENTIFIERS as PART_IDS,
  STOCK_WAREHOUSE_ORDERPOINT_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
  STOCK_WAREHOUSE_ORDERPOINT_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/stock/stock-universal-identifiers.constant';

const notSnoozed = (universalIdentifier: string, operand: ViewFilterOperand, positionInViewFilterGroup: number) => ({
  universalIdentifier,
  fieldMetadataUniversalIdentifier: FIELD_IDS.snoozedUntil,
  operand,
  value: '',
  viewFilterGroupUniversalIdentifier: PART_IDS.notSnoozedGroup,
  positionInViewFilterGroup,
});

// Active manual rules with something to order that are not snoozed past today.
export default defineView({
  universalIdentifier: ORDERPOINT_VIEW_UNIVERSAL_IDENTIFIERS.replenishment,
  name: 'Replenishment',
  objectUniversalIdentifier: STOCK_WAREHOUSE_ORDERPOINT_OBJECT_UNIVERSAL_IDENTIFIER,
  type: ViewType.TABLE,
  icon: 'IconRefresh',
  position: 1,
  fields: orderpointViewFields(PART_IDS),
  filterGroups: [
    { universalIdentifier: PART_IDS.allGroup, logicalOperator: ViewFilterGroupLogicalOperator.AND },
    {
      universalIdentifier: PART_IDS.notSnoozedGroup,
      logicalOperator: ViewFilterGroupLogicalOperator.OR,
      parentViewFilterGroupUniversalIdentifier: PART_IDS.allGroup,
      positionInViewFilterGroup: 3,
    },
  ],
  filters: [
    {
      universalIdentifier: PART_IDS.filterTrigger,
      fieldMetadataUniversalIdentifier: FIELD_IDS.trigger,
      operand: ViewFilterOperand.IS,
      value: [ORDERPOINT_TRIGGER.MANUAL],
      viewFilterGroupUniversalIdentifier: PART_IDS.allGroup,
      positionInViewFilterGroup: 0,
    },
    // A number filter has no strict "greater than"; any positive stored
    // quantity is at least one millionth.
    {
      universalIdentifier: PART_IDS.filterToOrder,
      fieldMetadataUniversalIdentifier: FIELD_IDS.qtyToOrder,
      operand: ViewFilterOperand.GREATER_THAN_OR_EQUAL,
      value: '0.000001',
      viewFilterGroupUniversalIdentifier: PART_IDS.allGroup,
      positionInViewFilterGroup: 1,
    },
    {
      universalIdentifier: PART_IDS.filterActive,
      fieldMetadataUniversalIdentifier: FIELD_IDS.active,
      operand: ViewFilterOperand.IS,
      value: 'true',
      viewFilterGroupUniversalIdentifier: PART_IDS.allGroup,
      positionInViewFilterGroup: 2,
    },
    notSnoozed(PART_IDS.filterSnoozeEmpty, ViewFilterOperand.IS_EMPTY, 0),
    notSnoozed(PART_IDS.filterSnoozePast, ViewFilterOperand.IS_IN_PAST, 1),
    notSnoozed(PART_IDS.filterSnoozeToday, ViewFilterOperand.IS_TODAY, 2),
  ],
});
