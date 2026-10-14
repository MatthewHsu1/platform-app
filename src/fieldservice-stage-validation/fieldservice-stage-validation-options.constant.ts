import { type StageRuleField } from 'src/fieldservice-stage-validation/types/stage-rule-field.type';
import { type SelectFieldOption } from 'src/shared/fields';

// The order fields a stage rule may require, in the order a missing one is reported. The number, priority,
// closed status, service area copy and actual duration are always set or written by the app, so none is listed.
// Tags, categories and the equipment and worker links are not listed: staff lists and link rows cannot be read
// from the order alone.
export const STAGE_RULE_FIELDS: StageRuleField[] = [
  { value: 'TEAM', label: 'Team', field: 'teamId', selection: 'teamId' },
  { value: 'LOCATION', label: 'Location', field: 'locationId', selection: 'locationId' },
  { value: 'LOCATION_DIRECTIONS', label: 'Location directions', field: 'locationDirections', selection: 'locationDirections' },
  { value: 'REQUEST_EARLY', label: 'Earliest request date', field: 'requestEarly', selection: 'requestEarly' },
  { value: 'REQUEST_LATE', label: 'Latest request date', field: 'requestLate', selection: 'requestLate' },
  { value: 'DESCRIPTION', label: 'Description', field: 'description', selection: 'description { markdown }' },
  { value: 'PERSON', label: 'Assigned to', field: 'personId', selection: 'personId' },
  { value: 'SCHEDULED_DATE_START', label: 'Scheduled start', field: 'scheduledDateStart', selection: 'scheduledDateStart' },
  { value: 'SCHEDULED_DURATION', label: 'Scheduled duration (hours)', field: 'scheduledDuration', selection: 'scheduledDuration' },
  { value: 'SCHEDULED_DATE_END', label: 'Scheduled end', field: 'scheduledDateEnd', selection: 'scheduledDateEnd' },
  { value: 'TODO', label: 'Instructions', field: 'todo', selection: 'todo { markdown }' },
  { value: 'RESOLUTION', label: 'Resolution', field: 'resolution', selection: 'resolution { markdown }' },
  { value: 'DATE_START', label: 'Actual start', field: 'dateStart', selection: 'dateStart' },
  { value: 'DATE_END', label: 'Actual end', field: 'dateEnd', selection: 'dateEnd' },
  { value: 'SIGNED_BY', label: 'Signed by', field: 'signedBy', selection: 'signedBy' },
  { value: 'SIGNED_ON', label: 'Signed on', field: 'signedOn', selection: 'signedOn' },
  { value: 'TEMPLATE', label: 'Template', field: 'templateId', selection: 'templateId' },
  { value: 'ORDER_TYPE', label: 'Type', field: 'orderTypeId', selection: 'orderTypeId' },
];

export const STAGE_RULE_FIELD_OPTIONS: SelectFieldOption[] = STAGE_RULE_FIELDS.map(({ value, label }) => ({ value, label, color: 'gray' }));

// What a read of an order must ask for to check any rule.
export const STAGE_RULE_VALUES_SELECTION = STAGE_RULE_FIELDS.map((entry) => entry.selection).join(' ');
