import { useState } from 'react';
import { themeCssVariables } from 'twenty-ui/theme';

import { optionsShowing } from 'src/shared/front-components/utils/choice-options.util';
import { type ChoiceOption } from 'src/shared/front-components/types/choice-option.type';

type ChoiceSelectProps<TValue extends string> = {
  value: TValue;
  options: ChoiceOption<TValue>[];
  onChange: (value: TValue) => void;
  disabled?: boolean;
  title?: string;
};

// A native select styled like a Twenty field: the UI kit's popup menus do not
// work inside a front component. Theme tokens are read here, never at module
// level, where they break the app build.
export const ChoiceSelect = <TValue extends string = string>({ value, options, onChange, disabled = false, title }: ChoiceSelectProps<TValue>) => {
  const theme = themeCssVariables;
  const [isFocused, setIsFocused] = useState(false);
  const shown = optionsShowing(value, options);

  return (
    <select
      value={value}
      disabled={disabled}
      title={title}
      onChange={(event) => onChange(event.target.value as TValue)}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      style={{
        height: 32,
        padding: `0 ${theme.spacing[2]}`,
        borderRadius: theme.border.radius.sm,
        border: `1px solid ${isFocused ? theme.color.blue : theme.border.color.medium}`,
        background: theme.background.transparent.lighter,
        color: theme.font.color.primary,
        fontFamily: theme.font.family,
        fontSize: theme.font.size.md,
        outline: 'none',
      }}
    >
      {shown.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
};
