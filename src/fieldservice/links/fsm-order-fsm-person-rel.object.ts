import { defineObject, OnDeleteAction } from 'twenty-sdk/define';

import {
  FSM_ORDER_FIELD_UNIVERSAL_IDENTIFIERS,
  FSM_ORDER_FSM_PERSON_REL_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
  FSM_ORDER_FSM_PERSON_REL_OBJECT_UNIVERSAL_IDENTIFIER,
  FSM_ORDER_OBJECT_UNIVERSAL_IDENTIFIER,
  FSM_PERSON_FIELD_UNIVERSAL_IDENTIFIERS,
  FSM_PERSON_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/fieldservice/fieldservice-universal-identifiers.constant';
import { manyToOneField } from 'src/shared/fields';

// Deleting either side removes the link row (the triggers destroy it); a removed link is destroyed, not trashed.
export default defineObject({
  universalIdentifier: FSM_ORDER_FSM_PERSON_REL_OBJECT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'fsmOrderFsmPersonRel',
  namePlural: 'fsmOrderFsmPersonRels',
  labelSingular: 'Order worker link',
  labelPlural: 'Order worker links',
  description: 'Adds a field service worker to a service order',
  icon: 'IconLink',
  fields: [
    manyToOneField({
      universalIdentifier: FIELD_IDS.order,
      name: 'order',
      label: 'Service order',
      icon: 'IconTruck',
      onDelete: OnDeleteAction.CASCADE,
      targetObjectUniversalIdentifier: FSM_ORDER_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: FSM_ORDER_FIELD_UNIVERSAL_IDENTIFIERS.persons,
    }),
    manyToOneField({
      universalIdentifier: FIELD_IDS.person,
      name: 'person',
      label: 'Worker',
      icon: 'IconUserCog',
      onDelete: OnDeleteAction.CASCADE,
      targetObjectUniversalIdentifier: FSM_PERSON_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: FSM_PERSON_FIELD_UNIVERSAL_IDENTIFIERS.orderLinks,
    }),
  ],
});
