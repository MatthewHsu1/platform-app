import { useState } from 'react';
import { type Field, formatQuery, QueryBuilder, type RuleGroupType } from 'react-querybuilder';
import { Button } from 'twenty-ui/primitives/input';
import { themeCssVariables } from 'twenty-ui/theme';

import { FILTER_EDITOR_CONTROLS, filterEditorCss } from 'src/shared/filter-editor/filter-editor-controls';
import { type FilterEditorTexts } from 'src/shared/filter-editor/types/filter-editor-texts.type';
import { type FilterField } from 'src/shared/filter-editor/types/filter-field.type';
import { type FilterOperator } from 'src/shared/filter-editor/types/filter-operator.type';

const EMPTY_QUERY: RuleGroupType = { combinator: 'and', rules: [] };

const asQuery = (value: unknown): RuleGroupType =>
  value !== null && typeof value === 'object' && Array.isArray((value as RuleGroupType).rules) ? (value as RuleGroupType) : EMPTY_QUERY;

// "Is one of" on a list of choices ticks several of them.
const choiceEditor = (operator: string) => (operator === 'in' || operator === 'notIn' ? 'multiselect' : 'select');

type FilterEditorProps = {
  fields: FilterField[];
  value: unknown;
  texts: FilterEditorTexts;
  onSave: (query: unknown) => Promise<void>;
};

// A filter built with buttons and lists and saved as the query's JSON, for any
// object. Errors are shown, never thrown: a thrown error kills the component
// until the page reloads.
export const FilterEditor = ({ fields, value, texts, onSave }: FilterEditorProps) => {
  const theme = themeCssVariables;
  const [query, setQuery] = useState<RuleGroupType>(asQuery(value));
  const [status, setStatus] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const operatorOption = (name: FilterOperator) => ({ name, value: name, label: texts.operators[name] });
  const allOperators = (Object.keys(texts.operators) as FilterOperator[]).map(operatorOption);
  const builderFields: Field[] = fields.map((field) => ({
    name: field.name,
    label: field.label,
    inputType: field.inputType,
    valueEditorType: field.valueEditorType === 'select' ? choiceEditor : field.valueEditorType,
    values: field.values,
    operators: field.operators?.map(operatorOption),
  }));

  const save = async () => {
    setIsSaving(true);
    setStatus(texts.saving);
    try {
      await onSave(JSON.parse(formatQuery(query, 'json_without_ids')));
      setStatus(texts.saved);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="platform-filter-editor" style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[2], padding: theme.spacing[3] }}>
      <style>{filterEditorCss()}</style>
      <QueryBuilder
        fields={builderFields}
        operators={allOperators}
        combinators={[
          { name: 'and', value: 'and', label: texts.and },
          { name: 'or', value: 'or', label: texts.or },
        ]}
        query={query}
        onQueryChange={setQuery}
        controlElements={FILTER_EDITOR_CONTROLS}
        translations={texts.translations}
        showNotToggle
        resetOnOperatorChange
      />
      <div style={{ display: 'flex', gap: theme.spacing[2], alignItems: 'center' }}>
        <Button size="sm" variant="solid" color="accent" disabled={isSaving} onClick={() => void save()}>
          {texts.save}
        </Button>
        {status === null ? null : <span>{status}</span>}
      </div>
    </div>
  );
};
