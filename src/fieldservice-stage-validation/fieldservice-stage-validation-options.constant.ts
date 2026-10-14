import { type StageRuleField } from 'src/fieldservice-stage-validation/types/stage-rule-field.type';
import { type SelectFieldOption } from 'src/shared/fields';

// The order fields a stage rule may require, in the order a missing one is reported. The number, priority,
// closed status, service area copy and actual duration are always set or written by the app, so none is listed.
// Tags and categories are staff lists: a rule row names them (and any other field staff added) in "Other fields".
// Equipment and extra workers are link rows, which a validation rule cannot read; code counts them.
export const STAGE_RULE_FIELDS: StageRuleField[] = [
  { value: 'TEAM', label: 'Team', field: 'teamId', ruleName: 'team', selection: 'teamId', check: 'defined' },
  { value: 'LOCATION', label: 'Location', field: 'locationId', ruleName: 'location', selection: 'locationId', check: 'defined' },
  { value: 'LOCATION_DIRECTIONS', label: 'Location directions', field: 'locationDirections', ruleName: 'locationDirections', selection: 'locationDirections', check: 'filled' },
  { value: 'REQUEST_EARLY', label: 'Earliest request date', field: 'requestEarly', ruleName: 'requestEarly', selection: 'requestEarly', check: 'filled' },
  { value: 'REQUEST_LATE', label: 'Latest request date', field: 'requestLate', ruleName: 'requestLate', selection: 'requestLate', check: 'filled' },
  { value: 'DESCRIPTION', label: 'Description', field: 'description', ruleName: 'description', selection: 'description { markdown }', check: 'filled' },
  { value: 'PERSON', label: 'Assigned to', field: 'personId', ruleName: 'person', selection: 'personId', check: 'defined' },
  { value: 'SCHEDULED_DATE_START', label: 'Scheduled start', field: 'scheduledDateStart', ruleName: 'scheduledDateStart', selection: 'scheduledDateStart', check: 'filled' },
  { value: 'SCHEDULED_DURATION', label: 'Scheduled duration (hours)', field: 'scheduledDuration', ruleName: 'scheduledDuration', selection: 'scheduledDuration', check: 'positive' },
  { value: 'SCHEDULED_DATE_END', label: 'Scheduled end', field: 'scheduledDateEnd', ruleName: 'scheduledDateEnd', selection: 'scheduledDateEnd', check: 'filled' },
  { value: 'TODO', label: 'Instructions', field: 'todo', ruleName: 'todo', selection: 'todo { markdown }', check: 'filled' },
  { value: 'RESOLUTION', label: 'Resolution', field: 'resolution', ruleName: 'resolution', selection: 'resolution { markdown }', check: 'filled' },
  { value: 'DATE_START', label: 'Actual start', field: 'dateStart', ruleName: 'dateStart', selection: 'dateStart', check: 'filled' },
  { value: 'DATE_END', label: 'Actual end', field: 'dateEnd', ruleName: 'dateEnd', selection: 'dateEnd', check: 'filled' },
  { value: 'SIGNED_BY', label: 'Signed by', field: 'signedBy', ruleName: 'signedBy', selection: 'signedBy', check: 'filled' },
  { value: 'SIGNED_ON', label: 'Signed on', field: 'signedOn', ruleName: 'signedOn', selection: 'signedOn', check: 'filled' },
  { value: 'TEMPLATE', label: 'Template', field: 'templateId', ruleName: 'template', selection: 'templateId', check: 'defined' },
  { value: 'ORDER_TYPE', label: 'Type', field: 'orderTypeId', ruleName: 'orderType', selection: 'orderTypeId', check: 'defined' },
  { value: 'EQUIPMENTS', label: 'Equipment', field: 'equipments', ruleName: 'equipments', selection: '', check: 'link' },
  { value: 'PERSONS', label: 'Field service workers', field: 'persons', ruleName: 'persons', selection: '', check: 'link' },
];

export const STAGE_RULE_FIELD_OPTIONS: SelectFieldOption[] = STAGE_RULE_FIELDS.map(({ value, label }) => ({ value, label, color: 'gray' }));

// The names of the validation rules the sync keeps; rules with other names are never touched.
export const STAGE_RULE_VALIDATION_PREFIX = 'platform-stage-rule:';
