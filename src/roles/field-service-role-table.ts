import {
  RES_BRANCH_OBJECT_UNIVERSAL_IDENTIFIER,
  RES_DISTRICT_OBJECT_UNIVERSAL_IDENTIFIER,
  RES_REGION_OBJECT_UNIVERSAL_IDENTIFIER,
  RES_TERRITORY_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/base-territory/base-territory-universal-identifiers.constant';
import { STOCK_REFERENCE_FSM_ORDER_REL_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/fieldservice-stock/fieldservice-stock-universal-identifiers.constant';
import {
  FSM_EQUIPMENT_FSM_ORDER_REL_OBJECT_UNIVERSAL_IDENTIFIER,
  FSM_EQUIPMENT_OBJECT_UNIVERSAL_IDENTIFIER,
  FSM_LOCATION_OBJECT_UNIVERSAL_IDENTIFIER,
  FSM_LOCATION_PERSON_OBJECT_UNIVERSAL_IDENTIFIER,
  FSM_ORDER_FSM_PERSON_REL_OBJECT_UNIVERSAL_IDENTIFIER,
  FSM_ORDER_OBJECT_UNIVERSAL_IDENTIFIER,
  FSM_ORDER_TYPE_OBJECT_UNIVERSAL_IDENTIFIER,
  FSM_PERSON_OBJECT_UNIVERSAL_IDENTIFIER,
  FSM_PERSON_RES_TERRITORY_REL_OBJECT_UNIVERSAL_IDENTIFIER,
  FSM_TEAM_OBJECT_UNIVERSAL_IDENTIFIER,
  FSM_TEMPLATE_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/fieldservice/fieldservice-universal-identifiers.constant';
import { type FieldServiceRoleRow } from 'src/roles/types/field-service-role-row.type';
import { type Rights } from 'src/roles/types/rights.type';
import { linkRights } from 'src/roles/utils/role-rights.util';

const row = (objectUniversalIdentifier: string, userOwn: Rights, user: Rights, dispatcher: Rights, manager: Rights): FieldServiceRoleRow => ({
  objectUniversalIdentifier,
  userOwn,
  user,
  dispatcher,
  manager,
});

// Columns: Field service: User (own documents), User, Dispatcher, Manager. Twenty has one right for create and
// edit, so a level that may edit a table may also add rows to it. Everyone with a level works orders, locations,
// workers and order types; the dispatcher also deletes orders; nobody deletes a location; the manager owns the
// teams, templates and equipment. Every level keeps the service area tables.
export const FIELD_SERVICE_ROLE_TABLE: FieldServiceRoleRow[] = [
  row(FSM_ORDER_OBJECT_UNIVERSAL_IDENTIFIER, 'RU', 'RU', 'RUD', 'RUD'),
  // Adding equipment, extra workers or stock references to an order adds and removes link rows: whoever edits an
  // order needs it.
  row(FSM_EQUIPMENT_FSM_ORDER_REL_OBJECT_UNIVERSAL_IDENTIFIER, linkRights('RU'), linkRights('RU'), 'RUD', 'RUD'),
  row(FSM_ORDER_FSM_PERSON_REL_OBJECT_UNIVERSAL_IDENTIFIER, linkRights('RU'), linkRights('RU'), 'RUD', 'RUD'),
  row(STOCK_REFERENCE_FSM_ORDER_REL_OBJECT_UNIVERSAL_IDENTIFIER, linkRights('RU'), linkRights('RU'), 'RUD', 'RUD'),
  row(FSM_LOCATION_OBJECT_UNIVERSAL_IDENTIFIER, 'RU', 'RU', 'RU', 'RU'),
  row(FSM_PERSON_OBJECT_UNIVERSAL_IDENTIFIER, 'RU', 'RU', 'RU', 'RUD'),
  row(FSM_PERSON_RES_TERRITORY_REL_OBJECT_UNIVERSAL_IDENTIFIER, linkRights('RU'), linkRights('RU'), linkRights('RU'), 'RUD'),
  row(FSM_LOCATION_PERSON_OBJECT_UNIVERSAL_IDENTIFIER, 'RU', 'RU', 'RU', 'RUD'),
  row(FSM_ORDER_TYPE_OBJECT_UNIVERSAL_IDENTIFIER, 'RU', 'RU', 'RU', 'RUD'),
  row(FSM_EQUIPMENT_OBJECT_UNIVERSAL_IDENTIFIER, 'R', 'R', 'R', 'RUD'),
  row(FSM_TEMPLATE_OBJECT_UNIVERSAL_IDENTIFIER, 'R', 'R', 'R', 'RUD'),
  row(FSM_TEAM_OBJECT_UNIVERSAL_IDENTIFIER, 'R', 'R', 'R', 'RUD'),
  row(RES_REGION_OBJECT_UNIVERSAL_IDENTIFIER, 'RUD', 'RUD', 'RUD', 'RUD'),
  row(RES_DISTRICT_OBJECT_UNIVERSAL_IDENTIFIER, 'RUD', 'RUD', 'RUD', 'RUD'),
  row(RES_BRANCH_OBJECT_UNIVERSAL_IDENTIFIER, 'RUD', 'RUD', 'RUD', 'RUD'),
  row(RES_TERRITORY_OBJECT_UNIVERSAL_IDENTIFIER, 'RUD', 'RUD', 'RUD', 'RUD'),
];
