import { type FilterOperator } from 'src/shared/filter-editor/types/filter-operator.type';

// One field the user may filter on. `name` is the record path the evaluator
// reads ("product.name" for one hop). A record picker stores record ids.
export type FilterField = {
  name: string;
  label: string;
  inputType?: 'text' | 'number' | 'date';
  valueEditorType?: 'text' | 'select' | 'recordPicker';
  values?: { name: string; label: string }[];
  operators?: FilterOperator[];
  recordPicker?: { objectPlural: string; labelField: string; labelKind: 'text' | 'fullName' };
};
