import { useCallback, useEffect, useState } from 'react';
import { Button } from 'twenty-ui/primitives/input';
import { themeCssVariables } from 'twenty-ui/theme';

import { type FilterEditorTexts } from 'src/shared/filter-editor/types/filter-editor-texts.type';
import { type FilterField } from 'src/shared/filter-editor/types/filter-field.type';
import { type RecordSearch } from 'src/shared/filter-editor/types/record-search.type';
import { ErrorText } from 'src/shared/front-components/pop-up';
import { RecordSearchPicker } from 'src/shared/front-components/record-search-picker';
import { type PickedRecord } from 'src/shared/front-components/types/picked-record.type';

const idsOf = (value: unknown): string[] =>
  (Array.isArray(value) ? value : value === null || value === undefined || value === '' ? [] : [value]).map(String);

type RecordPickerValueEditorProps = {
  value: unknown;
  multiple: boolean;
  picker: NonNullable<FilterField['recordPicker']>;
  search: RecordSearch;
  texts: FilterEditorTexts;
  disabled?: boolean;
  onChange: (value: string | string[]) => void;
};

// A condition on a relation names records by id: one id, or a list for "is
// one of". The labels of stored ids are read back for display.
export const RecordPickerValueEditor = ({ value, multiple, picker, search, texts, disabled = false, onChange }: RecordPickerValueEditorProps) => {
  const theme = themeCssVariables;
  const { objectPlural, labelField, labelKind } = picker;
  const chosenIds = idsOf(value);
  const chosenKey = chosenIds.join(',');
  const [labels, setLabels] = useState<ReadonlyMap<string, string>>(new Map());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ids = chosenKey === '' ? [] : chosenKey.split(',');

    setError(null);
    if (ids.length === 0) {
      return;
    }
    let isCurrent = true;

    search({ objectPlural, labelField, labelKind, ids })
      .then((found) => {
        if (isCurrent) {
          setLabels(new Map(found.map((record) => [record.id, record.label])));
        }
      })
      .catch((caught: unknown) => {
        if (isCurrent) {
          setError(caught instanceof Error ? caught.message : String(caught));
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [chosenKey, objectPlural, labelField, labelKind, search]);

  const searchByText = useCallback(
    (text: string) => search({ objectPlural, labelField, labelKind, text }),
    [objectPlural, labelField, labelKind, search],
  );
  const chosen: PickedRecord[] = chosenIds.map((id) => ({ id, label: labels.get(id) ?? id }));
  const pickerTexts = {
    placeholder: texts.search ?? '',
    clearLabel: texts.clear ?? '',
    searchErrorLabel: texts.searchError ?? '',
  };

  if (!multiple) {
    return (
      <span style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[1] }}>
        <RecordSearchPicker
          value={chosen[0] ?? null}
          placeholder={pickerTexts.placeholder}
          clearLabel={pickerTexts.clearLabel}
          searchErrorLabel={pickerTexts.searchErrorLabel}
          search={searchByText}
          disabled={disabled}
          onChange={(record) => onChange(record?.id ?? '')}
        />
        <ErrorText error={error} />
      </span>
    );
  }

  return (
    <span style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[1] }}>
      <span style={{ display: 'flex', flexWrap: 'wrap', gap: theme.spacing[1] }}>
        {chosen.map((record) => (
          <Button
            key={record.id}
            size="sm"
            variant="outline"
            title={pickerTexts.clearLabel}
            disabled={disabled}
            onClick={() => onChange(chosenIds.filter((id) => id !== record.id))}
          >
            {`${record.label} ✕`}
          </Button>
        ))}
      </span>
      <RecordSearchPicker
        value={null}
        placeholder={pickerTexts.placeholder}
        clearLabel={pickerTexts.clearLabel}
        searchErrorLabel={pickerTexts.searchErrorLabel}
        search={searchByText}
        disabled={disabled}
        onChange={(record) => {
          if (record !== null && !chosenIds.includes(record.id)) {
            onChange([...chosenIds, record.id]);
          }
        }}
      />
      <ErrorText error={error} />
    </span>
  );
};
