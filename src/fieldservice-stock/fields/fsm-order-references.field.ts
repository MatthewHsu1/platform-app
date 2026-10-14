import { defineField } from 'twenty-sdk/define';

import {
  FIELDSERVICE_STOCK_FIELD_UNIVERSAL_IDENTIFIERS,
  STOCK_REFERENCE_FSM_ORDER_REL_FIELD_UNIVERSAL_IDENTIFIERS as LINK_IDS,
  STOCK_REFERENCE_FSM_ORDER_REL_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/fieldservice-stock/fieldservice-stock-universal-identifiers.constant';
import { FSM_ORDER_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/fieldservice/fieldservice-universal-identifiers.constant';
import { oneToManyField } from 'src/shared/fields';

export default defineField({
  ...oneToManyField({
    universalIdentifier: FIELDSERVICE_STOCK_FIELD_UNIVERSAL_IDENTIFIERS.fsmOrderReferences,
    name: 'references',
    label: 'Stock references',
    icon: 'IconLink',
    targetObjectUniversalIdentifier: STOCK_REFERENCE_FSM_ORDER_REL_OBJECT_UNIVERSAL_IDENTIFIER,
    targetFieldUniversalIdentifier: LINK_IDS.order,
    junctionTargetFieldUniversalIdentifier: LINK_IDS.reference,
  }),
  objectUniversalIdentifier: FSM_ORDER_OBJECT_UNIVERSAL_IDENTIFIER,
});
