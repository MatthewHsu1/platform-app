import { type SelectFieldOption } from 'src/shared/fields';

// The priority decides the hours a request may wait, by position: normal, low, high, urgent.
export const ORDER_PRIORITY = { NORMAL: 'NORMAL', LOW: 'LOW', HIGH: 'HIGH', URGENT: 'URGENT' } as const;

export const ORDER_PRIORITY_OPTIONS: SelectFieldOption[] = [
  { value: ORDER_PRIORITY.NORMAL, label: 'Normal', color: 'gray' },
  { value: ORDER_PRIORITY.LOW, label: 'Low', color: 'blue' },
  { value: ORDER_PRIORITY.HIGH, label: 'High', color: 'orange' },
  { value: ORDER_PRIORITY.URGENT, label: 'Urgent', color: 'red' },
];

// What code reads of the stage: open, completed or cancelled.
export const CLOSED_STATUS = { OPEN: 'OPEN', COMPLETED: 'COMPLETED', CANCELLED: 'CANCELLED' } as const;

export const CLOSED_STATUS_OPTIONS: SelectFieldOption[] = [
  { value: CLOSED_STATUS.OPEN, label: 'Open', color: 'blue' },
  { value: CLOSED_STATUS.COMPLETED, label: 'Completed', color: 'green' },
  { value: CLOSED_STATUS.CANCELLED, label: 'Cancelled', color: 'gray' },
];

// The stage is a staff list: the install hook makes it once with these options, and staff add their own.
// Code knows only these three values: a new order starts in New, and Completed and Cancelled close it.
export const ORDER_STAGE = { NEW: 'NEW', COMPLETED: 'COMPLETED', CANCELLED: 'CANCELLED' } as const;

export const ORDER_STAGE_OPTIONS = [
  { value: ORDER_STAGE.NEW, label: 'New', color: 'sky', position: 0 },
  { value: ORDER_STAGE.COMPLETED, label: 'Completed', color: 'green', position: 1 },
  { value: ORDER_STAGE.CANCELLED, label: 'Cancelled', color: 'gray', position: 2 },
];

// Twenty refuses a staff list without options, so tags and categories start with one.
export const OTHER_OPTION = [{ value: 'OTHER', label: 'Other', color: 'gray', position: 0 }];

export const TERRITORY_TYPE_OPTIONS = [
  { value: 'ZIP', label: 'Zip', color: 'blue', position: 0 },
  { value: 'STATE', label: 'State', color: 'green', position: 1 },
  { value: 'COUNTRY', label: 'Country', color: 'purple', position: 2 },
];

export const WARRANTY_UNIT = { DAY: 'DAY', WEEK: 'WEEK', MONTH: 'MONTH', YEAR: 'YEAR' } as const;

export const WARRANTY_UNIT_OPTIONS: SelectFieldOption[] = [
  { value: WARRANTY_UNIT.DAY, label: 'Days', color: 'gray' },
  { value: WARRANTY_UNIT.WEEK, label: 'Weeks', color: 'blue' },
  { value: WARRANTY_UNIT.MONTH, label: 'Months', color: 'green' },
  { value: WARRANTY_UNIT.YEAR, label: 'Years', color: 'purple' },
];

export const ORDER_INTERNAL_TYPE = { FSM: 'FSM' } as const;

export const ORDER_INTERNAL_TYPE_OPTIONS: SelectFieldOption[] = [{ value: ORDER_INTERNAL_TYPE.FSM, label: 'Field service', color: 'blue' }];

export const ORDER_SEQUENCE_CODE = 'fsm.order';

// An order shows this until a number is taken.
export const NO_ORDER_NUMBER = 'New';

// Rows the install step makes once; code finds them by key after staff rename them.
export const FIELDSERVICE_SEED_KEYS = {
  sequence: 'fieldservice.seq_fsm_order',
  defaultTeam: 'fieldservice.fsm_team_default',
} as const;
