import { type ChangeEvent, type ReactNode, useState } from 'react';
import { themeCssVariables } from 'twenty-ui/theme';

import { getRowAccessSettingsStyles } from 'src/row-access/constants/row-access-settings-styles.constant';

type OwnerFieldSelectProps = {
  'aria-label': string;
  value: string | undefined;
  disabled: boolean;
  onChange: (event: ChangeEvent<HTMLSelectElement>) => void;
  children: ReactNode;
};

export const OwnerFieldSelect = ({
  'aria-label': ariaLabel,
  value,
  disabled,
  onChange,
  children,
}: OwnerFieldSelectProps) => {
  const styles = getRowAccessSettingsStyles();
  const [isFocused, setIsFocused] = useState(false);

  return (
    <select
      aria-label={ariaLabel}
      value={value}
      disabled={disabled}
      onChange={onChange}
      style={{
        ...styles.ownerFieldSelect,
        borderColor: isFocused
          ? themeCssVariables.color.blue
          : themeCssVariables.border.color.medium,
        color: disabled
          ? themeCssVariables.font.color.tertiary
          : themeCssVariables.font.color.primary,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
    >
      {children}
    </select>
  );
};
