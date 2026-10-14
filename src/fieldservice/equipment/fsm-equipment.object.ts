import { defineObject, OnDeleteAction, STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS } from 'twenty-sdk/define';

import {
  RES_BRANCH_FIELD_UNIVERSAL_IDENTIFIERS as BRANCH_IDS,
  RES_BRANCH_OBJECT_UNIVERSAL_IDENTIFIER,
  RES_DISTRICT_FIELD_UNIVERSAL_IDENTIFIERS as DISTRICT_IDS,
  RES_DISTRICT_OBJECT_UNIVERSAL_IDENTIFIER,
  RES_REGION_FIELD_UNIVERSAL_IDENTIFIERS as REGION_IDS,
  RES_REGION_OBJECT_UNIVERSAL_IDENTIFIER,
  RES_TERRITORY_FIELD_UNIVERSAL_IDENTIFIERS as TERRITORY_IDS,
  RES_TERRITORY_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/base-territory/base-territory-universal-identifiers.constant';
import { areaField, dateField, richTextField } from 'src/fieldservice/fieldservice-fields';
import { WARRANTY_UNIT, WARRANTY_UNIT_OPTIONS } from 'src/fieldservice/fieldservice-options.constant';
import {
  FIELDSERVICE_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS as INVERSE_IDS,
  FSM_EQUIPMENT_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
  FSM_EQUIPMENT_FSM_ORDER_REL_FIELD_UNIVERSAL_IDENTIFIERS as ORDER_LINK_IDS,
  FSM_EQUIPMENT_FSM_ORDER_REL_OBJECT_UNIVERSAL_IDENTIFIER,
  FSM_EQUIPMENT_OBJECT_UNIVERSAL_IDENTIFIER,
  FSM_LOCATION_FIELD_UNIVERSAL_IDENTIFIERS as LOCATION_IDS,
  FSM_LOCATION_OBJECT_UNIVERSAL_IDENTIFIER,
  FSM_PERSON_FIELD_UNIVERSAL_IDENTIFIERS as WORKER_IDS,
  FSM_PERSON_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/fieldservice/fieldservice-universal-identifiers.constant';
import { manyToOneField, numberField, oneToManyField, selectField, textField } from 'src/shared/fields';

const partnerField = (universalIdentifier: string, name: string, label: string, isCompany: boolean, inverseUniversalIdentifier: string) =>
  manyToOneField({
    universalIdentifier,
    name,
    label,
    icon: isCompany ? 'IconBuildingSkyscraper' : 'IconUser',
    onDelete: OnDeleteAction.SET_NULL,
    targetObjectUniversalIdentifier: isCompany
      ? STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.company.universalIdentifier
      : STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.universalIdentifier,
    targetFieldUniversalIdentifier: inverseUniversalIdentifier,
  });

// A machine at a location that staff service. The service area follows the location unless staff set it; the
// warranty end follows the warranty start, length and unit unless staff set it. The warranty length and unit
// sit on the equipment until equipment links to a product. Owner and manager are a person or a company.
export default defineObject({
  universalIdentifier: FSM_EQUIPMENT_OBJECT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'fsmEquipment',
  namePlural: 'fsmEquipments',
  labelSingular: 'Equipment',
  labelPlural: 'Equipment',
  description: 'A machine at a service location that field service workers look after',
  icon: 'IconTool',
  labelIdentifierFieldMetadataUniversalIdentifier: FIELD_IDS.name,
  fields: [
    textField(FIELD_IDS.name, 'name', 'Name', 'IconAbc'),
    manyToOneField({
      universalIdentifier: FIELD_IDS.person,
      name: 'person',
      label: 'Assigned operator',
      icon: 'IconUserCog',
      onDelete: OnDeleteAction.SET_NULL,
      targetObjectUniversalIdentifier: FSM_PERSON_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: WORKER_IDS.equipments,
    }),
    manyToOneField({
      universalIdentifier: FIELD_IDS.location,
      name: 'location',
      label: 'Assigned location',
      icon: 'IconMapPin',
      onDelete: OnDeleteAction.SET_NULL,
      targetObjectUniversalIdentifier: FSM_LOCATION_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: LOCATION_IDS.equipments,
    }),
    manyToOneField({
      universalIdentifier: FIELD_IDS.currentLocation,
      name: 'currentLocation',
      label: 'Current location',
      icon: 'IconMapPin',
      onDelete: OnDeleteAction.SET_NULL,
      targetObjectUniversalIdentifier: FSM_LOCATION_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: LOCATION_IDS.currentEquipments,
    }),
    richTextField(FIELD_IDS.notes, 'notes', 'Notes', 'IconNotes'),
    areaField(FIELD_IDS.territory, 'territory', 'Territory', 'IconMapPin', RES_TERRITORY_OBJECT_UNIVERSAL_IDENTIFIER, TERRITORY_IDS.fsmEquipments),
    areaField(FIELD_IDS.branch, 'branch', 'Branch', 'IconMapPins', RES_BRANCH_OBJECT_UNIVERSAL_IDENTIFIER, BRANCH_IDS.fsmEquipments),
    areaField(FIELD_IDS.district, 'district', 'District', 'IconMap', RES_DISTRICT_OBJECT_UNIVERSAL_IDENTIFIER, DISTRICT_IDS.fsmEquipments),
    areaField(FIELD_IDS.region, 'region', 'Region', 'IconWorld', RES_REGION_OBJECT_UNIVERSAL_IDENTIFIER, REGION_IDS.fsmEquipments),
    partnerField(FIELD_IDS.managedByPerson, 'managedByPerson', 'Managed by (contact)', false, INVERSE_IDS.personManagedFsmEquipments),
    partnerField(FIELD_IDS.managedByCompany, 'managedByCompany', 'Managed by (company)', true, INVERSE_IDS.companyManagedFsmEquipments),
    partnerField(FIELD_IDS.ownedByPerson, 'ownedByPerson', 'Owned by (contact)', false, INVERSE_IDS.personOwnedFsmEquipments),
    partnerField(FIELD_IDS.ownedByCompany, 'ownedByCompany', 'Owned by (company)', true, INVERSE_IDS.companyOwnedFsmEquipments),
    manyToOneField({
      universalIdentifier: FIELD_IDS.parent,
      name: 'parent',
      label: 'Parent',
      icon: 'IconHierarchy',
      onDelete: OnDeleteAction.SET_NULL,
      targetObjectUniversalIdentifier: FSM_EQUIPMENT_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: FIELD_IDS.children,
    }),
    oneToManyField({
      universalIdentifier: FIELD_IDS.children,
      name: 'children',
      label: 'Children',
      icon: 'IconHierarchy',
      targetObjectUniversalIdentifier: FSM_EQUIPMENT_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: FIELD_IDS.parent,
    }),
    textField(FIELD_IDS.serial, 'serial', 'Serial number', 'IconBarcode'),
    { ...dateField(FIELD_IDS.warrantyStartDate, 'warrantyStartDate', 'Warranty start', 'IconCalendarPlus'), defaultValue: 'now' },
    dateField(FIELD_IDS.warrantyEndDate, 'warrantyEndDate', 'Warranty end', 'IconCalendarMinus'),
    numberField(FIELD_IDS.productWarranty, 'productWarranty', 'Warranty length', 'IconShieldCheck', { decimals: 0, int: true, defaultValue: 0 }),
    selectField(FIELD_IDS.productWarrantyType, 'productWarrantyType', 'Warranty unit', 'IconShieldCheck', WARRANTY_UNIT.MONTH, WARRANTY_UNIT_OPTIONS),
    oneToManyField({
      universalIdentifier: FIELD_IDS.orders,
      name: 'orders',
      label: 'Service orders',
      icon: 'IconTruck',
      targetObjectUniversalIdentifier: FSM_EQUIPMENT_FSM_ORDER_REL_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: ORDER_LINK_IDS.equipment,
      junctionTargetFieldUniversalIdentifier: ORDER_LINK_IDS.order,
    }),
  ],
});
