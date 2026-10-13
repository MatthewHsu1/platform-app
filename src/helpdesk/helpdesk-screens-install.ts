import {
  HELPDESK_TICKET_CATEGORY_OBJECT_UNIVERSAL_IDENTIFIER,
  HELPDESK_TICKET_OBJECT_UNIVERSAL_IDENTIFIER,
  HELPDESK_TICKET_STAGE_OBJECT_UNIVERSAL_IDENTIFIER,
  HELPDESK_TICKET_TEAM_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/helpdesk/helpdesk-universal-identifiers.constant';
import { HELPDESK_TICKET_SLA_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/helpdesk-sla/helpdesk-sla-universal-identifiers.constant';
import { HELPDESK_TICKET_TYPE_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/helpdesk-type/helpdesk-type-universal-identifiers.constant';
import { type ModuleInstallSpec } from 'src/shared/install/install-spec.type';

// The columns a case list or card shows; every other field stays a hidden column.
const CASE_COLUMNS = ['number', 'name', 'stage', 'priority', 'assignedUser', 'team', 'person', 'company', 'slaDeadline', 'createdAt'];

// The cases board (stage columns are drawn by the case board sync), the lists of cases, and the order of the main
// lists. The "SLA expired" lists catch a case or row that is flagged expired and also one still in progress whose
// deadline has passed, so no job has to flag it: the view reads the clock. Cases made on the page start without a
// team, so the lists of cases leave nothing out by team.
export const HELPDESK_SCREENS_INSTALL: ModuleInstallSpec = {
  firstVersion: '2.5.0',
  staffLists: [],
  defaultRows: [],
  seedRows: [],
  validationRules: [],
  boards: [
    {
      objectUniversalIdentifier: HELPDESK_TICKET_OBJECT_UNIVERSAL_IDENTIFIER,
      name: 'Cases board',
      icon: 'IconLayoutKanban',
      groupByFieldName: 'stage',
      cardFields: ['name', 'number', 'priority', 'assignedUser', 'team'],
    },
  ],
  lists: [
    {
      objectUniversalIdentifier: HELPDESK_TICKET_OBJECT_UNIVERSAL_IDENTIFIER,
      name: 'My cases',
      icon: 'IconUser',
      columns: CASE_COLUMNS,
      filters: [{ fieldName: 'assignedUser', operand: 'IS', value: 'CURRENT_MEMBER' }],
    },
    {
      objectUniversalIdentifier: HELPDESK_TICKET_OBJECT_UNIVERSAL_IDENTIFIER,
      name: 'Unassigned',
      icon: 'IconUserOff',
      columns: CASE_COLUMNS,
      filters: [{ fieldName: 'assignedUser', operand: 'IS_EMPTY', value: [] }],
    },
    {
      objectUniversalIdentifier: HELPDESK_TICKET_OBJECT_UNIVERSAL_IDENTIFIER,
      name: 'SLA expired',
      icon: 'IconAlarm',
      columns: CASE_COLUMNS,
      filters: [],
      anyOf: [
        { fieldName: 'slaStateExpired', operand: 'IS', value: true },
        { fieldName: 'slaDeadline', operand: 'IS_IN_PAST', value: [] },
      ],
    },
    {
      objectUniversalIdentifier: HELPDESK_TICKET_SLA_OBJECT_UNIVERSAL_IDENTIFIER,
      name: 'Expired',
      icon: 'IconAlarm',
      columns: ['name', 'ticket', 'sla', 'state', 'deadline', 'hours', 'consumedTime'],
      filters: [],
      anyOf: [
        { fieldName: 'state', operand: 'IS', value: ['EXPIRED'] },
        {
          allOf: [
            { fieldName: 'state', operand: 'IS', value: ['IN_PROGRESS'] },
            { fieldName: 'deadline', operand: 'IS_IN_PAST', value: [] },
          ],
        },
      ],
    },
  ],
  viewSorts: [
    {
      objectUniversalIdentifier: HELPDESK_TICKET_OBJECT_UNIVERSAL_IDENTIFIER,
      viewName: 'All',
      sorts: [
        { fieldName: 'priority', direction: 'DESC' },
        { fieldName: 'number', direction: 'DESC' },
      ],
    },
    { objectUniversalIdentifier: HELPDESK_TICKET_TEAM_OBJECT_UNIVERSAL_IDENTIFIER, viewName: 'All', sorts: [{ fieldName: 'sequence', direction: 'ASC' }] },
    { objectUniversalIdentifier: HELPDESK_TICKET_STAGE_OBJECT_UNIVERSAL_IDENTIFIER, viewName: 'All', sorts: [{ fieldName: 'sequence', direction: 'ASC' }] },
    { objectUniversalIdentifier: HELPDESK_TICKET_CATEGORY_OBJECT_UNIVERSAL_IDENTIFIER, viewName: 'All', sorts: [{ fieldName: 'sequence', direction: 'ASC' }] },
    { objectUniversalIdentifier: HELPDESK_TICKET_TYPE_OBJECT_UNIVERSAL_IDENTIFIER, viewName: 'All', sorts: [{ fieldName: 'name', direction: 'ASC' }] },
    { objectUniversalIdentifier: HELPDESK_TICKET_SLA_OBJECT_UNIVERSAL_IDENTIFIER, viewName: 'All', sorts: [{ fieldName: 'state', direction: 'ASC' }] },
  ],
};
