import { defineField } from 'twenty-sdk/define';

import {
  FIELDSERVICE_STOCK_FIELD_UNIVERSAL_IDENTIFIERS,
  STOCK_REFERENCE_FSM_ORDER_REL_FIELD_UNIVERSAL_IDENTIFIERS as LINK_IDS,
  STOCK_REFERENCE_FSM_ORDER_REL_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/fieldservice-stock/fieldservice-stock-universal-identifiers.constant';
import { oneToManyField } from 'src/shared/fields';
import { STOCK_REFERENCE_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/stock/stock-universal-identifiers.constant';

export default defineField({
  ...oneToManyField({
    universalIdentifier: FIELDSERVICE_STOCK_FIELD_UNIVERSAL_IDENTIFIERS.stockReferenceFsmOrders,
    name: 'fsmOrders',
    label: 'Service orders',
    icon: 'IconTruck',
    targetObjectUniversalIdentifier: STOCK_REFERENCE_FSM_ORDER_REL_OBJECT_UNIVERSAL_IDENTIFIER,
    targetFieldUniversalIdentifier: LINK_IDS.reference,
    junctionTargetFieldUniversalIdentifier: LINK_IDS.order,
  }),
  objectUniversalIdentifier: STOCK_REFERENCE_OBJECT_UNIVERSAL_IDENTIFIER,
});
