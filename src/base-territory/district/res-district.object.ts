import { defineObject, OnDeleteAction, STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS } from 'twenty-sdk/define';

import {
  BASE_TERRITORY_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS as INVERSE_IDS,
  RES_BRANCH_FIELD_UNIVERSAL_IDENTIFIERS as BRANCH_IDS,
  RES_BRANCH_OBJECT_UNIVERSAL_IDENTIFIER,
  RES_DISTRICT_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
  RES_DISTRICT_OBJECT_UNIVERSAL_IDENTIFIER,
  RES_REGION_FIELD_UNIVERSAL_IDENTIFIERS as REGION_IDS,
  RES_REGION_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/base-territory/base-territory-universal-identifiers.constant';
import {
  FSM_EQUIPMENT_FIELD_UNIVERSAL_IDENTIFIERS as EQUIPMENT_IDS,
  FSM_EQUIPMENT_OBJECT_UNIVERSAL_IDENTIFIER,
  FSM_LOCATION_FIELD_UNIVERSAL_IDENTIFIERS as LOCATION_IDS,
  FSM_LOCATION_OBJECT_UNIVERSAL_IDENTIFIER,
  FSM_ORDER_FIELD_UNIVERSAL_IDENTIFIERS as ORDER_IDS,
  FSM_ORDER_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/fieldservice/fieldservice-universal-identifiers.constant';
import { manyToOneField, oneToManyField, textField } from 'src/shared/fields';

// A part of a region, made of branches.
export default defineObject({
  universalIdentifier: RES_DISTRICT_OBJECT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'resDistrict',
  namePlural: 'resDistricts',
  labelSingular: 'District',
  labelPlural: 'Districts',
  description: 'A service area inside a region, made of branches',
  icon: 'IconMap',
  labelIdentifierFieldMetadataUniversalIdentifier: FIELD_IDS.name,
  fields: [
    textField(FIELD_IDS.name, 'name', 'Name', 'IconAbc'),
    manyToOneField({
      universalIdentifier: FIELD_IDS.region,
      name: 'region',
      label: 'Region',
      icon: 'IconWorld',
      onDelete: OnDeleteAction.SET_NULL,
      targetObjectUniversalIdentifier: RES_REGION_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: REGION_IDS.districts,
    }),
    manyToOneField({
      universalIdentifier: FIELD_IDS.partner,
      name: 'partner',
      label: 'District manager',
      icon: 'IconUserStar',
      onDelete: OnDeleteAction.SET_NULL,
      targetObjectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.universalIdentifier,
      targetFieldUniversalIdentifier: INVERSE_IDS.personDistrictsManaged,
    }),
    textField(FIELD_IDS.description, 'description', 'Description', 'IconFileText'),
    oneToManyField({
      universalIdentifier: FIELD_IDS.branches,
      name: 'branches',
      label: 'Branches',
      icon: 'IconMapPins',
      targetObjectUniversalIdentifier: RES_BRANCH_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: BRANCH_IDS.district,
    }),
    oneToManyField({
      universalIdentifier: FIELD_IDS.fsmLocations,
      name: 'fsmLocations',
      label: 'Service locations',
      icon: 'IconMapPin',
      targetObjectUniversalIdentifier: FSM_LOCATION_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: LOCATION_IDS.district,
    }),
    oneToManyField({
      universalIdentifier: FIELD_IDS.fsmEquipments,
      name: 'fsmEquipments',
      label: 'Equipment',
      icon: 'IconTool',
      targetObjectUniversalIdentifier: FSM_EQUIPMENT_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: EQUIPMENT_IDS.district,
    }),
    oneToManyField({
      universalIdentifier: FIELD_IDS.fsmOrders,
      name: 'fsmOrders',
      label: 'Service orders',
      icon: 'IconTruck',
      targetObjectUniversalIdentifier: FSM_ORDER_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: ORDER_IDS.district,
    }),
  ],
});
