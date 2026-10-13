import { CASE_PRIORITY_OPTIONS, KANBAN_STATE_OPTIONS } from 'src/helpdesk/helpdesk-options.constant';
import { type CaseRow } from 'src/helpdesk/types/case-row.type';
import { type FilterField } from 'src/shared/filter-editor/types/filter-field.type';
import { type FilterOperator } from 'src/shared/filter-editor/types/filter-operator.type';

// The operators the in-memory evaluator reads.
const SCALAR_OPERATORS: FilterOperator[] = ['=', '!=', 'in', 'notIn', 'null', 'notNull'];
const LIST_OPERATORS: FilterOperator[] = ['containsAny'];

// The case fields a policy filter can test, with the labels the editor shows (translated where the editor draws them).
export const CASE_FILTER_FIELDS: FilterField[] = [
  { name: 'name', label: 'Title', valueEditorType: 'text', operators: SCALAR_OPERATORS },
  {
    name: 'priority',
    label: 'Priority',
    valueEditorType: 'select',
    values: CASE_PRIORITY_OPTIONS.map((option) => ({ name: option.value, label: option.label })),
    operators: SCALAR_OPERATORS,
  },
  { name: 'channel', label: 'Channel', valueEditorType: 'text', operators: SCALAR_OPERATORS },
  {
    name: 'kanbanState',
    label: 'Kanban state',
    valueEditorType: 'select',
    values: KANBAN_STATE_OPTIONS.map((option) => ({ name: option.value, label: option.label })),
    operators: SCALAR_OPERATORS,
  },
  { name: 'partnerName', label: 'Contact name', valueEditorType: 'text', operators: SCALAR_OPERATORS },
  { name: 'partnerEmail', label: 'Contact email', valueEditorType: 'text', operators: SCALAR_OPERATORS },
  {
    name: 'teamId',
    label: 'Team',
    valueEditorType: 'recordPicker',
    operators: SCALAR_OPERATORS,
    recordPicker: { objectPlural: 'helpdeskTicketTeams', labelField: 'name', labelKind: 'text' },
  },
  {
    name: 'categoryId',
    label: 'Category',
    valueEditorType: 'recordPicker',
    operators: SCALAR_OPERATORS,
    recordPicker: { objectPlural: 'helpdeskTicketCategories', labelField: 'name', labelKind: 'text' },
  },
  {
    name: 'personId',
    label: 'Contact',
    valueEditorType: 'recordPicker',
    operators: SCALAR_OPERATORS,
    recordPicker: { objectPlural: 'people', labelField: 'name', labelKind: 'fullName' },
  },
  {
    name: 'companyId',
    label: 'Customer company',
    valueEditorType: 'recordPicker',
    operators: SCALAR_OPERATORS,
    recordPicker: { objectPlural: 'companies', labelField: 'name', labelKind: 'text' },
  },
  {
    name: 'assignedUserId',
    label: 'Assigned to',
    valueEditorType: 'recordPicker',
    operators: SCALAR_OPERATORS,
    recordPicker: { objectPlural: 'workspaceMembers', labelField: 'name', labelKind: 'fullName' },
  },
  {
    name: 'ticketTypeId',
    label: 'Type',
    valueEditorType: 'recordPicker',
    operators: SCALAR_OPERATORS,
    recordPicker: { objectPlural: 'helpdeskTicketTypes', labelField: 'name', labelKind: 'text' },
  },
  {
    name: 'productId',
    label: 'Product',
    valueEditorType: 'recordPicker',
    operators: SCALAR_OPERATORS,
    recordPicker: { objectPlural: 'productProducts', labelField: 'name', labelKind: 'text' },
  },
  {
    name: 'tagIds',
    label: 'Tags',
    valueEditorType: 'recordPicker',
    operators: LIST_OPERATORS,
    recordPicker: { objectPlural: 'helpdeskTicketTags', labelField: 'name', labelKind: 'text' },
  },
];

// The case as a policy filter reads it: these keys, and the tag ids.
export const caseFilterRecord = (row: CaseRow, tagIds: string[]): Record<string, unknown> => ({
  name: row.name,
  priority: row.priority,
  channel: row.channel,
  kanbanState: row.kanbanState,
  partnerName: row.partnerName,
  partnerEmail: row.partnerEmail?.primaryEmail ?? null,
  teamId: row.teamId,
  categoryId: row.categoryId,
  personId: row.personId,
  companyId: row.companyId,
  assignedUserId: row.assignedUserId,
  ticketTypeId: row.ticketTypeId ?? null,
  productId: row.productId ?? null,
  tagIds,
});
