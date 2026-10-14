import { defineObject, OnDeleteAction } from 'twenty-sdk/define';

import {
  FIELDSERVICE_STOCK_FIELD_UNIVERSAL_IDENTIFIERS,
  STOCK_REFERENCE_FSM_ORDER_REL_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
  STOCK_REFERENCE_FSM_ORDER_REL_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/fieldservice-stock/fieldservice-stock-universal-identifiers.constant';
import { FSM_ORDER_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/fieldservice/fieldservice-universal-identifiers.constant';
import { manyToOneField } from 'src/shared/fields';
import { STOCK_REFERENCE_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/stock/stock-universal-identifiers.constant';

// Deleting either side removes the link row (the trigger destroys it); a removed link is destroyed, not trashed.
export default defineObject({
  universalIdentifier: STOCK_REFERENCE_FSM_ORDER_REL_OBJECT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'stockReferenceFsmOrderRel',
  namePlural: 'stockReferenceFsmOrderRels',
  labelSingular: 'Order reference link',
  labelPlural: 'Order reference links',
  description: 'Puts a stock reference on a service order',
  icon: 'IconLink',
  fields: [
    manyToOneField({
      universalIdentifier: FIELD_IDS.reference,
      name: 'reference',
      label: 'Stock reference',
      icon: 'IconHash',
      onDelete: OnDeleteAction.CASCADE,
      targetObjectUniversalIdentifier: STOCK_REFERENCE_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: FIELDSERVICE_STOCK_FIELD_UNIVERSAL_IDENTIFIERS.stockReferenceFsmOrders,
    }),
    manyToOneField({
      universalIdentifier: FIELD_IDS.order,
      name: 'order',
      label: 'Service order',
      icon: 'IconTruck',
      onDelete: OnDeleteAction.CASCADE,
      targetObjectUniversalIdentifier: FSM_ORDER_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: FIELDSERVICE_STOCK_FIELD_UNIVERSAL_IDENTIFIERS.fsmOrderReferences,
    }),
  ],
});
