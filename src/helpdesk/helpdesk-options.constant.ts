import { type SelectFieldOption } from 'src/shared/fields';

export const CASE_PRIORITY = { LOW: 'LOW', MEDIUM: 'MEDIUM', HIGH: 'HIGH', VERY_HIGH: 'VERY_HIGH' } as const;

export const CASE_PRIORITY_OPTIONS: SelectFieldOption[] = [
  { value: CASE_PRIORITY.LOW, label: 'Low', color: 'gray' },
  { value: CASE_PRIORITY.MEDIUM, label: 'Medium', color: 'blue' },
  { value: CASE_PRIORITY.HIGH, label: 'High', color: 'orange' },
  { value: CASE_PRIORITY.VERY_HIGH, label: 'Very high', color: 'red' },
];

export const KANBAN_STATE = { NORMAL: 'NORMAL', DONE: 'DONE', BLOCKED: 'BLOCKED' } as const;

export const KANBAN_STATE_OPTIONS: SelectFieldOption[] = [
  { value: KANBAN_STATE.NORMAL, label: 'Default', color: 'gray' },
  { value: KANBAN_STATE.DONE, label: 'Ready for next stage', color: 'green' },
  { value: KANBAN_STATE.BLOCKED, label: 'Blocked', color: 'red' },
];

export const CASE_SEQUENCE_CODE = 'helpdesk.ticket.sequence';

// A case shows this until a number is taken.
export const NO_NUMBER = '/';

// The join column Twenty lists next to a relation field name in an event's updated fields.
export const CASE_RELATION_JOIN_COLUMNS: Record<string, string> = {
  assignedUserId: 'assignedUser',
  stageId: 'stage',
  personId: 'person',
  companyId: 'company',
  teamId: 'team',
  categoryId: 'category',
  duplicateId: 'duplicate',
  typeId: 'type',
  productId: 'product',
};

// Rows the install step makes once; code finds them by key after staff rename them.
export const HELPDESK_SEED_KEYS = {
  sequence: 'helpdesk_mgmt.helpdesk_ticket_sequence',
  stageNew: 'helpdesk_mgmt.helpdesk_ticket_stage_new',
  stageInProgress: 'helpdesk_mgmt.helpdesk_ticket_stage_in_progress',
  stageAwaiting: 'helpdesk_mgmt.helpdesk_ticket_stage_awaiting',
  stageDone: 'helpdesk_mgmt.helpdesk_ticket_stage_done',
  stageCancelled: 'helpdesk_mgmt.helpdesk_ticket_stage_cancelled',
  stageRejected: 'helpdesk_mgmt.helpdesk_ticket_stage_rejected',
} as const;

// The channel list is a staff list: the install hook makes it once, so these are only its first values.
export const CHANNEL_OPTIONS = [
  { value: 'WEB', label: 'Web', color: 'blue', position: 0 },
  { value: 'EMAIL', label: 'Email', color: 'purple', position: 1 },
  { value: 'PHONE', label: 'Phone', color: 'green', position: 2 },
  { value: 'OTHER', label: 'Other', color: 'gray', position: 3 },
];
