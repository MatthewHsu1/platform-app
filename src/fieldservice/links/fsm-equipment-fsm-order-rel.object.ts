import { defineObject, OnDeleteAction } from 'twenty-sdk/define';

import {
  FSM_EQUIPMENT_FIELD_UNIVERSAL_IDENTIFIERS,
  FSM_EQUIPMENT_FSM_ORDER_REL_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
  FSM_EQUIPMENT_FSM_ORDER_REL_OBJECT_UNIVERSAL_IDENTIFIER,
  FSM_EQUIPMENT_OBJECT_UNIVERSAL_IDENTIFIER,
  FSM_ORDER_FIELD_UNIVERSAL_IDENTIFIERS,
  FSM_ORDER_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/fieldservice/fieldservice-universal-identifiers.constant';
import { manyToOneField } from 'src/shared/fields';

// Deleting either side removes the link row (the triggers destroy it); a removed link is destroyed, not trashed.
export default defineObject({
  universalIdentifier: FSM_EQUIPMENT_FSM_ORDER_REL_OBJECT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'fsmEquipmentFsmOrderRel',
  namePlural: 'fsmEquipmentFsmOrderRels',
  labelSingular: 'Order equipment link',
  labelPlural: 'Order equipment links',
  description: 'Puts a piece of equipment on a service order',
  icon: 'IconLink',
  fields: [
    manyToOneField({
      universalIdentifier: FIELD_IDS.equipment,
      name: 'equipment',
      label: 'Equipment',
      icon: 'IconTool',
      onDelete: OnDeleteAction.CASCADE,
      targetObjectUniversalIdentifier: FSM_EQUIPMENT_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: FSM_EQUIPMENT_FIELD_UNIVERSAL_IDENTIFIERS.orders,
    }),
    manyToOneField({
      universalIdentifier: FIELD_IDS.order,
      name: 'order',
      label: 'Service order',
      icon: 'IconTruck',
      onDelete: OnDeleteAction.CASCADE,
      targetObjectUniversalIdentifier: FSM_ORDER_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: FSM_ORDER_FIELD_UNIVERSAL_IDENTIFIERS.equipments,
    }),
  ],
});
