import { type FilterEditorTexts } from 'src/shared/filter-editor/types/filter-editor-texts.type';
import { type RecordSearch } from 'src/shared/filter-editor/types/record-search.type';

// What the editor hands its value editors besides the rule.
export type FilterEditorContext = {
  searchRecords?: RecordSearch;
  texts: FilterEditorTexts;
};
