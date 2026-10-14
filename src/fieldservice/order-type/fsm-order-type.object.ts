import { defineObject } from 'twenty-sdk/define';

import { ORDER_INTERNAL_TYPE, ORDER_INTERNAL_TYPE_OPTIONS } from 'src/fieldservice/fieldservice-options.constant';
import {
  FSM_ORDER_FIELD_UNIVERSAL_IDENTIFIERS as ORDER_IDS,
  FSM_ORDER_OBJECT_UNIVERSAL_IDENTIFIER,
  FSM_ORDER_TYPE_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
  FSM_ORDER_TYPE_OBJECT_UNIVERSAL_IDENTIFIER,
  FSM_TEMPLATE_FIELD_UNIVERSAL_IDENTIFIERS as TEMPLATE_IDS,
  FSM_TEMPLATE_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/fieldservice/fieldservice-universal-identifiers.constant';
import { oneToManyField, selectField, textField } from 'src/shared/fields';

// A kind of order. The internal type is what later modules branch on; field service knows one value.
export default defineObject({
  universalIdentifier: FSM_ORDER_TYPE_OBJECT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'fsmOrderType',
  namePlural: 'fsmOrderTypes',
  labelSingular: 'Service order type',
  labelPlural: 'Service order types',
  description: 'A kind of service order',
  icon: 'IconCategory',
  labelIdentifierFieldMetadataUniversalIdentifier: FIELD_IDS.name,
  fields: [
    textField(FIELD_IDS.name, 'name', 'Name', 'IconAbc'),
    selectField(FIELD_IDS.internalType, 'internalType', 'Internal type', 'IconCategory', ORDER_INTERNAL_TYPE.FSM, ORDER_INTERNAL_TYPE_OPTIONS),
    oneToManyField({
      universalIdentifier: FIELD_IDS.orders,
      name: 'orders',
      label: 'Orders',
      icon: 'IconTruck',
      targetObjectUniversalIdentifier: FSM_ORDER_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: ORDER_IDS.orderType,
    }),
    oneToManyField({
      universalIdentifier: FIELD_IDS.templates,
      name: 'templates',
      label: 'Templates',
      icon: 'IconTemplate',
      targetObjectUniversalIdentifier: FSM_TEMPLATE_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: TEMPLATE_IDS.orderType,
    }),
  ],
});
