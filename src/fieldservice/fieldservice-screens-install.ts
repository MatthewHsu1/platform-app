import { CLOSED_STATUS } from 'src/fieldservice/fieldservice-options.constant';
import {
  FSM_LOCATION_OBJECT_UNIVERSAL_IDENTIFIER,
  FSM_ORDER_OBJECT_UNIVERSAL_IDENTIFIER,
  FSM_TEAM_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/fieldservice/fieldservice-universal-identifiers.constant';
import { type ModuleInstallSpec } from 'src/shared/install/install-spec.type';

// The columns an order list shows, the label field first; every other field stays a hidden column. The stage is
// not among them: it is a staff list owned by the workspace, and Twenty refuses such a field as a column of a
// list the app makes. The closed status says whether the order is open.
const ORDER_COLUMNS = [
  'name',
  'priority',
  'location',
  'team',
  'person',
  'scheduledDateStart',
  'scheduledDateEnd',
  'requestLate',
  'closedStatus',
];

const OPEN = { fieldName: 'closedStatus', operand: 'IS' as const, value: [CLOSED_STATUS.OPEN] };

// The order board by stage, and the two lists a dispatcher works from: open orders without a worker, and open
// orders without a scheduled start.
export const FIELDSERVICE_SCREENS_INSTALL: ModuleInstallSpec = {
  firstVersion: '2.6.0',
  staffLists: [],
  defaultRows: [],
  seedRows: [],
  validationRules: [],
  boards: [
    {
      objectUniversalIdentifier: FSM_ORDER_OBJECT_UNIVERSAL_IDENTIFIER,
      name: 'Orders board',
      icon: 'IconLayoutKanban',
      groupByFieldName: 'stage',
      cardFields: ['name', 'priority', 'location', 'person', 'scheduledDateStart'],
    },
  ],
  lists: [
    {
      objectUniversalIdentifier: FSM_ORDER_OBJECT_UNIVERSAL_IDENTIFIER,
      name: 'To assign',
      icon: 'IconUserOff',
      columns: ORDER_COLUMNS,
      filters: [OPEN, { fieldName: 'person', operand: 'IS_EMPTY', value: [] }],
    },
    {
      objectUniversalIdentifier: FSM_ORDER_OBJECT_UNIVERSAL_IDENTIFIER,
      name: 'To schedule',
      icon: 'IconCalendarOff',
      columns: ORDER_COLUMNS,
      filters: [OPEN, { fieldName: 'scheduledDateStart', operand: 'IS_EMPTY', value: [] }],
    },
  ],
  viewSorts: [
    { objectUniversalIdentifier: FSM_ORDER_OBJECT_UNIVERSAL_IDENTIFIER, viewName: 'All', sorts: [{ fieldName: 'name', direction: 'DESC' }] },
    { objectUniversalIdentifier: FSM_TEAM_OBJECT_UNIVERSAL_IDENTIFIER, viewName: 'All', sorts: [{ fieldName: 'sequence', direction: 'ASC' }] },
    { objectUniversalIdentifier: FSM_LOCATION_OBJECT_UNIVERSAL_IDENTIFIER, viewName: 'All', sorts: [{ fieldName: 'completeName', direction: 'ASC' }] },
  ],
};
