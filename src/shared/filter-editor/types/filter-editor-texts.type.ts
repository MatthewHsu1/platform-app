import { type FilterOperator } from 'src/shared/filter-editor/types/filter-operator.type';

type ButtonText = { label: string; title: string };
type Tooltip = { title: string };

// Every text the editor shows, already translated by the caller.
export type FilterEditorTexts = {
  save: string;
  saving: string;
  saved: string;
  and: string;
  or: string;
  operators: Record<FilterOperator, string>;
  translations: Record<'addRule' | 'addGroup' | 'removeRule' | 'removeGroup' | 'notToggle', ButtonText> &
    Record<'fields' | 'operators' | 'value' | 'values' | 'combinators', Tooltip>;
};
