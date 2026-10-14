import { defineObject, OnDeleteAction } from 'twenty-sdk/define';

import { richTextField } from 'src/fieldservice/fieldservice-fields';
import {
  FSM_ORDER_FIELD_UNIVERSAL_IDENTIFIERS as ORDER_IDS,
  FSM_ORDER_OBJECT_UNIVERSAL_IDENTIFIER,
  FSM_ORDER_TYPE_FIELD_UNIVERSAL_IDENTIFIERS as ORDER_TYPE_IDS,
  FSM_ORDER_TYPE_OBJECT_UNIVERSAL_IDENTIFIER,
  FSM_TEAM_FIELD_UNIVERSAL_IDENTIFIERS as TEAM_IDS,
  FSM_TEAM_OBJECT_UNIVERSAL_IDENTIFIER,
  FSM_TEMPLATE_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
  FSM_TEMPLATE_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/fieldservice/fieldservice-universal-identifiers.constant';
import { manyToOneField, numberField, oneToManyField, textField } from 'src/shared/fields';

// A reusable job description. An order that picks a template takes its instructions. The categories are a
// staff list the install hook makes. `orderType` stands in for the type field, whose name Twenty reserves.
export default defineObject({
  universalIdentifier: FSM_TEMPLATE_OBJECT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'fsmTemplate',
  namePlural: 'fsmTemplates',
  labelSingular: 'Service order template',
  labelPlural: 'Service order templates',
  description: 'A reusable job description with instructions and a default duration',
  icon: 'IconTemplate',
  labelIdentifierFieldMetadataUniversalIdentifier: FIELD_IDS.name,
  fields: [
    textField(FIELD_IDS.name, 'name', 'Name', 'IconAbc'),
    richTextField(FIELD_IDS.instructions, 'instructions', 'Instructions', 'IconListCheck'),
    numberField(FIELD_IDS.duration, 'duration', 'Duration (hours)', 'IconHourglass', { defaultValue: 0 }),
    manyToOneField({
      universalIdentifier: FIELD_IDS.orderType,
      name: 'orderType',
      label: 'Type',
      icon: 'IconCategory',
      onDelete: OnDeleteAction.SET_NULL,
      targetObjectUniversalIdentifier: FSM_ORDER_TYPE_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: ORDER_TYPE_IDS.templates,
    }),
    manyToOneField({
      universalIdentifier: FIELD_IDS.team,
      name: 'team',
      label: 'Team',
      icon: 'IconUsersGroup',
      onDelete: OnDeleteAction.SET_NULL,
      targetObjectUniversalIdentifier: FSM_TEAM_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: TEAM_IDS.templates,
    }),
    oneToManyField({
      universalIdentifier: FIELD_IDS.orders,
      name: 'orders',
      label: 'Orders',
      icon: 'IconTruck',
      targetObjectUniversalIdentifier: FSM_ORDER_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: ORDER_IDS.template,
    }),
  ],
});
