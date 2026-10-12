import { useEffect, useState } from 'react';
import { Input } from 'twenty-ui/primitives/input';

import { ErrorText } from 'src/shared/front-components/pop-up';
import { readPopUpStyles } from 'src/shared/front-components/pop-up-styles';
import { type PickedRecord } from 'src/shared/front-components/types/picked-record.type';

const MINIMUM_SEARCH_LENGTH = 2;

// A search box and a short result list: the UI kit's record pickers do not
// run inside an app component. The caller supplies the search, which runs as
// the signed-in user.
export const RecordSearchPicker = ({
  value,
  placeholder,
  clearLabel,
  searchErrorLabel,
  search,
  onChange,
  disabled = false,
}: {
  value: PickedRecord | null;
  placeholder: string;
  clearLabel: string;
  searchErrorLabel: string;
  search: (text: string) => Promise<PickedRecord[]>;
  onChange: (record: PickedRecord | null) => void;
  disabled?: boolean;
}) => {
  const styles = readPopUpStyles();
  const [text, setText] = useState('');
  const [results, setResults] = useState<PickedRecord[]>([]);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const wanted = text.trim();

    setFailed(false);
    if (wanted.length < MINIMUM_SEARCH_LENGTH) {
      setResults([]);
      return;
    }

    let isCurrent = true;

    search(wanted)
      .then((found) => {
        if (isCurrent) {
          setResults(found);
        }
      })
      .catch(() => {
        if (isCurrent) {
          setResults([]);
          setFailed(true);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [text, search]);

  if (value !== null) {
    return (
      <div style={styles.row}>
        <span>{value.label}</span>
        <button type="button" style={styles.link} disabled={disabled} title={clearLabel} onClick={() => onChange(null)}>
          {clearLabel}
        </button>
      </div>
    );
  }

  return (
    <div style={{ ...styles.panel, padding: 0 }}>
      <Input value={text} placeholder={placeholder} disabled={disabled} onValueChange={setText} />
      <ErrorText error={failed ? searchErrorLabel : null} />
      {results.map((record) => (
        <button
          key={record.id}
          type="button"
          style={styles.link}
          disabled={disabled}
          onClick={() => {
            setText('');
            onChange(record);
          }}
        >
          {record.label}
        </button>
      ))}
    </div>
  );
};
