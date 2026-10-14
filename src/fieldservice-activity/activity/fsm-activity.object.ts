import { defineObject, OnDeleteAction, STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS } from 'twenty-sdk/define';

import { dateTimeField } from 'src/fieldservice/fieldservice-fields';
import {
  FSM_ORDER_OBJECT_UNIVERSAL_IDENTIFIER,
  FSM_TEMPLATE_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/fieldservice/fieldservice-universal-identifiers.constant';
import { ACTIVITY_STATE, ACTIVITY_STATE_OPTIONS } from 'src/fieldservice-activity/fieldservice-activity-options.constant';
import {
  FIELDSERVICE_ACTIVITY_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS as INVERSE_IDS,
  FSM_ACTIVITY_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
  FSM_ACTIVITY_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/fieldservice-activity/fieldservice-activity-universal-identifiers.constant';
import { appWritten, booleanField, manyToOneField, numberField, selectField, textField } from 'src/shared/fields';

// One step of a checklist: on a service order it is done by the worker, on a template it is a pattern copied to
// every order that picks the template. The state, who completed it and when are written by the Done and Cancel
// buttons; a template item stays to do. Deleting the order or template takes its items to the trash with it.
export default defineObject({
  universalIdentifier: FSM_ACTIVITY_OBJECT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'fsmActivity',
  namePlural: 'fsmActivities',
  labelSingular: 'Service activity',
  labelPlural: 'Service activities',
  description: 'One step of the checklist of a service order or of a service order template',
  icon: 'IconChecklist',
  labelIdentifierFieldMetadataUniversalIdentifier: FIELD_IDS.name,
  fields: [
    textField(FIELD_IDS.name, 'name', 'Name', 'IconAbc'),
    booleanField(FIELD_IDS.required, 'required', 'Required', 'IconAsterisk', false),
    numberField(FIELD_IDS.sequence, 'sequence', 'Sequence', 'IconArrowsSort', { decimals: 0, int: true, defaultValue: 10 }),
    appWritten(booleanField(FIELD_IDS.completed, 'completed', 'Completed', 'IconCircleCheck', false)),
    appWritten(dateTimeField(FIELD_IDS.completedOn, 'completedOn', 'Completed on', 'IconCalendarCheck')),
    appWritten(
      manyToOneField({
        universalIdentifier: FIELD_IDS.completedBy,
        name: 'completedBy',
        label: 'Completed by',
        icon: 'IconUserCheck',
        onDelete: OnDeleteAction.SET_NULL,
        targetObjectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.workspaceMember.universalIdentifier,
        targetFieldUniversalIdentifier: INVERSE_IDS.workspaceMemberFsmActivities,
      }),
    ),
    textField(FIELD_IDS.ref, 'ref', 'Reference', 'IconHash'),
    appWritten(selectField(FIELD_IDS.state, 'state', 'State', 'IconProgress', ACTIVITY_STATE.TODO, ACTIVITY_STATE_OPTIONS)),
    manyToOneField({
      universalIdentifier: FIELD_IDS.fsmOrder,
      name: 'fsmOrder',
      label: 'Service order',
      icon: 'IconTruck',
      onDelete: OnDeleteAction.CASCADE,
      targetObjectUniversalIdentifier: FSM_ORDER_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: INVERSE_IDS.fsmOrderOrderActivities,
    }),
    manyToOneField({
      universalIdentifier: FIELD_IDS.fsmTemplate,
      name: 'fsmTemplate',
      label: 'Service order template',
      icon: 'IconTemplate',
      onDelete: OnDeleteAction.CASCADE,
      targetObjectUniversalIdentifier: FSM_TEMPLATE_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: INVERSE_IDS.fsmTemplateTempActivities,
    }),
  ],
});
