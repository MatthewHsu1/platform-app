import { defineObject } from 'twenty-sdk/define';

import {
  FSM_LOCATION_FIELD_UNIVERSAL_IDENTIFIERS as LOCATION_IDS,
  FSM_LOCATION_OBJECT_UNIVERSAL_IDENTIFIER,
  FSM_ORDER_FIELD_UNIVERSAL_IDENTIFIERS as ORDER_IDS,
  FSM_ORDER_OBJECT_UNIVERSAL_IDENTIFIER,
  FSM_PERSON_FIELD_UNIVERSAL_IDENTIFIERS as WORKER_IDS,
  FSM_PERSON_OBJECT_UNIVERSAL_IDENTIFIER,
  FSM_TEAM_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
  FSM_TEAM_OBJECT_UNIVERSAL_IDENTIFIER,
  FSM_TEMPLATE_FIELD_UNIVERSAL_IDENTIFIERS as TEMPLATE_IDS,
  FSM_TEMPLATE_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/fieldservice/fieldservice-universal-identifiers.constant';
import { activeField, appWritten, numberField, oneToManyField, seedKeyField, textField } from 'src/shared/fields';

const countField = (universalIdentifier: string, name: string, label: string) =>
  appWritten(numberField(universalIdentifier, name, label, 'IconListNumbers', { decimals: 0, int: true, defaultValue: 0 }));

// A group of workers and their orders. A new order without a location team goes to the team with the lowest
// sequence. The three counts cover open orders only and are written by the order trigger.
export default defineObject({
  universalIdentifier: FSM_TEAM_OBJECT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'fsmTeam',
  namePlural: 'fsmTeams',
  labelSingular: 'Field service team',
  labelPlural: 'Field service teams',
  description: 'A group of field service workers and the orders they share',
  icon: 'IconUsersGroup',
  labelIdentifierFieldMetadataUniversalIdentifier: FIELD_IDS.name,
  fields: [
    textField(FIELD_IDS.name, 'name', 'Name', 'IconAbc'),
    textField(FIELD_IDS.description, 'description', 'Description', 'IconFileText'),
    activeField(FIELD_IDS.active),
    numberField(FIELD_IDS.sequence, 'sequence', 'Sequence', 'IconArrowsSort', { decimals: 0, int: true, defaultValue: 1 }),
    countField(FIELD_IDS.orderCount, 'orderCount', 'Open orders'),
    countField(FIELD_IDS.orderNeedAssignCount, 'orderNeedAssignCount', 'Orders to assign'),
    countField(FIELD_IDS.orderNeedScheduleCount, 'orderNeedScheduleCount', 'Orders to schedule'),
    seedKeyField(FIELD_IDS.seedKey),
    oneToManyField({
      universalIdentifier: FIELD_IDS.orders,
      name: 'orders',
      label: 'Orders',
      icon: 'IconTruck',
      targetObjectUniversalIdentifier: FSM_ORDER_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: ORDER_IDS.team,
    }),
    oneToManyField({
      universalIdentifier: FIELD_IDS.locations,
      name: 'locations',
      label: 'Locations',
      icon: 'IconMapPin',
      targetObjectUniversalIdentifier: FSM_LOCATION_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: LOCATION_IDS.team,
    }),
    oneToManyField({
      universalIdentifier: FIELD_IDS.persons,
      name: 'persons',
      label: 'Workers',
      icon: 'IconUserCog',
      targetObjectUniversalIdentifier: FSM_PERSON_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: WORKER_IDS.team,
    }),
    oneToManyField({
      universalIdentifier: FIELD_IDS.templates,
      name: 'templates',
      label: 'Templates',
      icon: 'IconTemplate',
      targetObjectUniversalIdentifier: FSM_TEMPLATE_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: TEMPLATE_IDS.team,
    }),
  ],
});
