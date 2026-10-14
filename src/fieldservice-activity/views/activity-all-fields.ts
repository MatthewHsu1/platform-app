import {
  FSM_ACTIVITY_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
  FSM_ACTIVITY_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/fieldservice-activity/fieldservice-activity-universal-identifiers.constant';
import { allFields } from 'src/stock/views/list-columns';

// The columns an activity table shows, the label field first; every other field stays a hidden column.
export const ACTIVITY_VISIBLE_FIELDS: string[] = [
  FIELD_IDS.name,
  FIELD_IDS.required,
  FIELD_IDS.ref,
  FIELD_IDS.sequence,
  FIELD_IDS.completedOn,
  FIELD_IDS.completedBy,
  FIELD_IDS.state,
];

export const ACTIVITY_ALL_FIELDS = allFields(FSM_ACTIVITY_OBJECT_UNIVERSAL_IDENTIFIER, [...Object.values(FIELD_IDS)]);
