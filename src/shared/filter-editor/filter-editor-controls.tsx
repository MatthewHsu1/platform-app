import { type ActionProps, type Controls, type FullField, type ValueEditorProps, type ValueSelectorProps } from 'react-querybuilder';
import { Button, Input } from 'twenty-ui/primitives/input';
import { themeCssVariables } from 'twenty-ui/theme';

import { RecordPickerValueEditor } from 'src/shared/filter-editor/record-picker-value-editor';
import { type FilterEditorContext } from 'src/shared/filter-editor/types/filter-editor-context.type';
import { type FilterField } from 'src/shared/filter-editor/types/filter-field.type';
import { ChoiceSelect } from 'src/shared/front-components/choice-select';
import { type ChoiceOption } from 'src/shared/front-components/types/choice-option.type';

type BuilderOption = { name: string; value?: string; label: string };

const choicesOf = (options: unknown): ChoiceOption[] =>
  (Array.isArray(options) ? (options as BuilderOption[]) : []).map((option) => ({ value: option.value ?? option.name, label: option.label }));

// A list saved as text is comma separated.
const listOf = (value: unknown) =>
  (Array.isArray(value) ? value.map(String) : String(value ?? '').split(',')).map((item) => item.trim()).filter((item) => item !== '');

type NativeSelectProps = ValueSelectorProps;

const NativeSelect = ({ value, options, disabled, title, handleOnChange }: NativeSelectProps) => (
  <ChoiceSelect value={value ?? ''} options={choicesOf(options)} disabled={disabled} title={title} onChange={(next) => handleOnChange(next)} />
);

type ActionButtonProps = ActionProps;

const ActionButton = ({ label, title, disabled, handleOnClick }: ActionButtonProps) => (
  <Button size="sm" variant="outline" title={title} disabled={disabled} onClick={() => handleOnClick()}>
    {label}
  </Button>
);

type MultiChoiceProps = { value: unknown; options: ChoiceOption[]; disabled?: boolean; title?: string; onChange: (value: string) => void };

// "Is one of" on a list of choices: native boxes, as the UI kit's checkbox is not proven in a front component.
const MultiChoice = ({ value, options, disabled, title, onChange }: MultiChoiceProps) => {
  const theme = themeCssVariables;
  const selected = new Set(listOf(value));
  const toggle = (choice: string, checked: boolean) =>
    onChange(
      options
        .filter((option) => (option.value === choice ? checked : selected.has(option.value)))
        .map((option) => option.value)
        .join(','),
    );

  return (
    <span title={title} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: theme.spacing[2] }}>
      {options.map((option) => (
        <label key={option.value} style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[1] }}>
          <input
            type="checkbox"
            checked={selected.has(option.value)}
            disabled={disabled}
            style={{ accentColor: theme.color.blue }}
            onChange={(event) => toggle(option.value, event.target.checked)}
          />
          {option.label}
        </label>
      ))}
    </span>
  );
};

type FilterValueEditorProps = ValueEditorProps;

const isListOperator = (operator: string) => operator === 'in' || operator === 'notIn' || operator === 'containsAny';

type BetweenProps = { value: unknown; inputType: string; disabled?: boolean; title?: string; onChange: (value: string) => void };

// Two bounds, saved as "low,high".
const Between = ({ value, inputType, disabled, title, onChange }: BetweenProps) => {
  const theme = themeCssVariables;
  const [low = '', high = ''] = Array.isArray(value) ? value.map(String) : String(value ?? '').split(',');

  return (
    <span title={title} style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[1] }}>
      <Input value={low} type={inputType} disabled={disabled} onValueChange={(next) => onChange(`${next},${high}`)} />
      <Input value={high} type={inputType} disabled={disabled} onValueChange={(next) => onChange(`${low},${next}`)} />
    </span>
  );
};

const FilterValueEditor = ({
  operator,
  type,
  inputType,
  value,
  values,
  disabled,
  title,
  fieldData,
  context,
  handleOnChange,
}: FilterValueEditorProps) => {
  if (operator === 'null' || operator === 'notNull') {
    return null;
  }
  const editorContext = context as FilterEditorContext | undefined;
  const recordPicker = (fieldData as FullField & Pick<FilterField, 'recordPicker'>).recordPicker;

  if (recordPicker !== undefined && editorContext?.searchRecords !== undefined) {
    return (
      <RecordPickerValueEditor
        value={value}
        multiple={isListOperator(operator)}
        picker={recordPicker}
        search={editorContext.searchRecords}
        texts={editorContext.texts}
        disabled={disabled}
        onChange={(next) => handleOnChange(next)}
      />
    );
  }
  if (operator === 'between') {
    return <Between value={value} inputType={inputType ?? 'text'} disabled={disabled} title={title} onChange={(next) => handleOnChange(next)} />;
  }
  if (type === 'multiselect') {
    return <MultiChoice value={value} options={choicesOf(values)} disabled={disabled} title={title} onChange={(next) => handleOnChange(next)} />;
  }
  if (type === 'select') {
    return (
      <ChoiceSelect value={String(value ?? '')} options={choicesOf(values)} disabled={disabled} title={title} onChange={(next) => handleOnChange(next)} />
    );
  }
  // A list is typed comma separated, which a number or date box does not take.
  const isList = isListOperator(operator);

  return (
    <Input
      value={Array.isArray(value) ? value.join(',') : String(value ?? '')}
      type={isList ? 'text' : (inputType ?? 'text')}
      disabled={disabled}
      title={title}
      onValueChange={(next) => handleOnChange(next)}
    />
  );
};

export const FILTER_EDITOR_CONTROLS: Partial<Controls<FullField, string>> = {
  fieldSelector: NativeSelect,
  operatorSelector: NativeSelect,
  combinatorSelector: NativeSelect,
  valueEditor: FilterValueEditor,
  addRuleAction: ActionButton,
  addGroupAction: ActionButton,
  removeRuleAction: ActionButton,
  removeGroupAction: ActionButton,
};

// Layout for the query builder's own class names, scoped to the editor. Call
// it inside a component: theme values read at module level break the app build.
export const filterEditorCss = () => {
  const theme = themeCssVariables;

  return `
.platform-filter-editor .queryBuilder { font-family: ${theme.font.family}; font-size: ${theme.font.size.md}; color: ${theme.font.color.primary}; }
.platform-filter-editor .ruleGroup { display: flex; flex-direction: column; gap: ${theme.spacing[2]}; padding: ${theme.spacing[2]}; border: 1px solid ${theme.border.color.light}; border-radius: ${theme.border.radius.md}; background: ${theme.background.secondary}; }
.platform-filter-editor .ruleGroup-header, .platform-filter-editor .rule { display: flex; flex-wrap: wrap; align-items: center; gap: ${theme.spacing[2]}; }
.platform-filter-editor .ruleGroup-body { display: flex; flex-direction: column; gap: ${theme.spacing[2]}; }
`;
};
