import {
  HELPDESK_SLA_CATEGORY_OBJECT_UNIVERSAL_IDENTIFIER,
  HELPDESK_SLA_IGNORE_STAGE_OBJECT_UNIVERSAL_IDENTIFIER,
  HELPDESK_SLA_OBJECT_UNIVERSAL_IDENTIFIER,
  HELPDESK_SLA_TAG_OBJECT_UNIVERSAL_IDENTIFIER,
  HELPDESK_SLA_TEAM_OBJECT_UNIVERSAL_IDENTIFIER,
  HELPDESK_TICKET_SLA_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/helpdesk-sla/helpdesk-sla-universal-identifiers.constant';
import { HELPDESK_TICKET_RELATED_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/helpdesk-ticket-related/helpdesk-ticket-related-universal-identifiers.constant';
import {
  HELPDESK_TICKET_TYPE_OBJECT_UNIVERSAL_IDENTIFIER,
  HELPDESK_TICKET_TYPE_TEAM_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/helpdesk-type/helpdesk-type-universal-identifiers.constant';
import {
  HELPDESK_TICKET_CATEGORY_OBJECT_UNIVERSAL_IDENTIFIER,
  HELPDESK_TICKET_OBJECT_UNIVERSAL_IDENTIFIER,
  HELPDESK_TICKET_STAGE_OBJECT_UNIVERSAL_IDENTIFIER,
  HELPDESK_TICKET_STAGE_TEAM_OBJECT_UNIVERSAL_IDENTIFIER,
  HELPDESK_TICKET_TAG_OBJECT_UNIVERSAL_IDENTIFIER,
  HELPDESK_TICKET_TAG_REL_OBJECT_UNIVERSAL_IDENTIFIER,
  HELPDESK_TICKET_TEAM_CATEGORY_OBJECT_UNIVERSAL_IDENTIFIER,
  HELPDESK_TICKET_TEAM_MEMBER_OBJECT_UNIVERSAL_IDENTIFIER,
  HELPDESK_TICKET_TEAM_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/helpdesk/helpdesk-universal-identifiers.constant';
import {
  RESOURCE_CALENDAR_ATTENDANCE_OBJECT_UNIVERSAL_IDENTIFIER,
  RESOURCE_CALENDAR_LEAVES_OBJECT_UNIVERSAL_IDENTIFIER,
  RESOURCE_CALENDAR_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/resource/resource-universal-identifiers.constant';
import { type Rights } from 'src/roles/types/rights.type';
import { type WorkCasesRoleRow } from 'src/roles/types/work-cases-role-row.type';
import { linkRights } from 'src/roles/utils/role-rights.util';

const row = (objectUniversalIdentifier: string, ownDocuments: Rights, allDocuments: Rights, administrator: Rights): WorkCasesRoleRow => ({
  objectUniversalIdentifier,
  ownDocuments,
  allDocuments,
  administrator,
});

// Columns: Work cases: Own Documents, Work cases: All Documents, Work cases: Administrator. Which cases a
// block reads is its row rule, not a right here. Whoever works on cases may change them and their service level
// rows; the tables the cases point at (teams, stages, categories, tags, types, policies, working hours) and the
// links between those tables belong to the administrator.
export const WORK_CASES_ROLE_TABLE: WorkCasesRoleRow[] = [
  row(HELPDESK_TICKET_OBJECT_UNIVERSAL_IDENTIFIER, 'RU', 'RU', 'RUD'),
  row(HELPDESK_TICKET_SLA_OBJECT_UNIVERSAL_IDENTIFIER, 'RU', 'RU', 'RUD'),
  // Tagging a case and relating two cases add and remove link rows: whoever edits a case needs it.
  row(HELPDESK_TICKET_TAG_REL_OBJECT_UNIVERSAL_IDENTIFIER, linkRights('RU'), linkRights('RU'), 'RUD'),
  row(HELPDESK_TICKET_RELATED_OBJECT_UNIVERSAL_IDENTIFIER, linkRights('RU'), linkRights('RU'), 'RUD'),
  row(HELPDESK_TICKET_TEAM_OBJECT_UNIVERSAL_IDENTIFIER, 'R', 'R', 'RUD'),
  row(HELPDESK_TICKET_STAGE_OBJECT_UNIVERSAL_IDENTIFIER, 'R', 'R', 'RUD'),
  row(HELPDESK_TICKET_CATEGORY_OBJECT_UNIVERSAL_IDENTIFIER, 'R', 'R', 'RUD'),
  row(HELPDESK_TICKET_TAG_OBJECT_UNIVERSAL_IDENTIFIER, 'R', 'R', 'RUD'),
  row(HELPDESK_TICKET_TYPE_OBJECT_UNIVERSAL_IDENTIFIER, 'R', 'R', 'RUD'),
  row(HELPDESK_SLA_OBJECT_UNIVERSAL_IDENTIFIER, 'R', 'R', 'RUD'),
  row(RESOURCE_CALENDAR_OBJECT_UNIVERSAL_IDENTIFIER, 'R', 'R', 'RUD'),
  row(RESOURCE_CALENDAR_ATTENDANCE_OBJECT_UNIVERSAL_IDENTIFIER, 'R', 'R', 'RUD'),
  row(RESOURCE_CALENDAR_LEAVES_OBJECT_UNIVERSAL_IDENTIFIER, 'R', 'R', 'RUD'),
  row(HELPDESK_TICKET_TEAM_MEMBER_OBJECT_UNIVERSAL_IDENTIFIER, 'R', 'R', 'RUD'),
  row(HELPDESK_TICKET_TEAM_CATEGORY_OBJECT_UNIVERSAL_IDENTIFIER, 'R', 'R', 'RUD'),
  row(HELPDESK_TICKET_STAGE_TEAM_OBJECT_UNIVERSAL_IDENTIFIER, 'R', 'R', 'RUD'),
  row(HELPDESK_TICKET_TYPE_TEAM_OBJECT_UNIVERSAL_IDENTIFIER, 'R', 'R', 'RUD'),
  row(HELPDESK_SLA_TEAM_OBJECT_UNIVERSAL_IDENTIFIER, 'R', 'R', 'RUD'),
  row(HELPDESK_SLA_CATEGORY_OBJECT_UNIVERSAL_IDENTIFIER, 'R', 'R', 'RUD'),
  row(HELPDESK_SLA_TAG_OBJECT_UNIVERSAL_IDENTIFIER, 'R', 'R', 'RUD'),
  row(HELPDESK_SLA_IGNORE_STAGE_OBJECT_UNIVERSAL_IDENTIFIER, 'R', 'R', 'RUD'),
];
