import { defineObject, OnDeleteAction } from 'twenty-sdk/define';

import {
  RES_BRANCH_FIELD_UNIVERSAL_IDENTIFIERS as BRANCH_IDS,
  RES_BRANCH_OBJECT_UNIVERSAL_IDENTIFIER,
  RES_TERRITORY_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
  RES_TERRITORY_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/base-territory/base-territory-universal-identifiers.constant';
import {
  FSM_EQUIPMENT_FIELD_UNIVERSAL_IDENTIFIERS as EQUIPMENT_IDS,
  FSM_EQUIPMENT_OBJECT_UNIVERSAL_IDENTIFIER,
  FSM_LOCATION_FIELD_UNIVERSAL_IDENTIFIERS as LOCATION_IDS,
  FSM_LOCATION_OBJECT_UNIVERSAL_IDENTIFIER,
  FSM_ORDER_FIELD_UNIVERSAL_IDENTIFIERS as ORDER_IDS,
  FSM_ORDER_OBJECT_UNIVERSAL_IDENTIFIER,
  FSM_PERSON_FIELD_UNIVERSAL_IDENTIFIERS as WORKER_IDS,
  FSM_PERSON_OBJECT_UNIVERSAL_IDENTIFIER,
  FSM_PERSON_RES_TERRITORY_REL_FIELD_UNIVERSAL_IDENTIFIERS as WORKER_TERRITORY_IDS,
  FSM_PERSON_RES_TERRITORY_REL_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/fieldservice/fieldservice-universal-identifiers.constant';
import { manyToOneField, oneToManyField, textField } from 'src/shared/fields';

// The smallest service area. Its district and region are its branch's. The kind of territory (zip, state,
// country) is a staff list the install hook makes; `territoryType` stands in for the field name Twenty reserves.
export default defineObject({
  universalIdentifier: RES_TERRITORY_OBJECT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'resTerritory',
  namePlural: 'resTerritories',
  labelSingular: 'Territory',
  labelPlural: 'Territories',
  description: 'The smallest service area, inside a branch',
  icon: 'IconMapPin',
  labelIdentifierFieldMetadataUniversalIdentifier: FIELD_IDS.name,
  fields: [
    textField(FIELD_IDS.name, 'name', 'Name', 'IconAbc'),
    manyToOneField({
      universalIdentifier: FIELD_IDS.branch,
      name: 'branch',
      label: 'Branch',
      icon: 'IconMapPins',
      onDelete: OnDeleteAction.SET_NULL,
      targetObjectUniversalIdentifier: RES_BRANCH_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: BRANCH_IDS.territories,
    }),
    textField(FIELD_IDS.description, 'description', 'Description', 'IconFileText'),
    textField(FIELD_IDS.zipCodes, 'zipCodes', 'Zip codes', 'IconMailbox'),
    manyToOneField({
      universalIdentifier: FIELD_IDS.person,
      name: 'person',
      label: 'Primary assignment',
      icon: 'IconUserStar',
      onDelete: OnDeleteAction.SET_NULL,
      targetObjectUniversalIdentifier: FSM_PERSON_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: WORKER_IDS.primaryTerritories,
    }),
    oneToManyField({
      universalIdentifier: FIELD_IDS.persons,
      name: 'persons',
      label: 'Field service workers',
      icon: 'IconUsers',
      targetObjectUniversalIdentifier: FSM_PERSON_RES_TERRITORY_REL_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: WORKER_TERRITORY_IDS.territory,
      junctionTargetFieldUniversalIdentifier: WORKER_TERRITORY_IDS.person,
    }),
    oneToManyField({
      universalIdentifier: FIELD_IDS.fsmLocations,
      name: 'fsmLocations',
      label: 'Service locations',
      icon: 'IconMapPin',
      targetObjectUniversalIdentifier: FSM_LOCATION_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: LOCATION_IDS.territory,
    }),
    oneToManyField({
      universalIdentifier: FIELD_IDS.fsmEquipments,
      name: 'fsmEquipments',
      label: 'Equipment',
      icon: 'IconTool',
      targetObjectUniversalIdentifier: FSM_EQUIPMENT_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: EQUIPMENT_IDS.territory,
    }),
    oneToManyField({
      universalIdentifier: FIELD_IDS.fsmOrders,
      name: 'fsmOrders',
      label: 'Service orders',
      icon: 'IconTruck',
      targetObjectUniversalIdentifier: FSM_ORDER_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: ORDER_IDS.territory,
    }),
  ],
});
