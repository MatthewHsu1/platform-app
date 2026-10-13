import { type ReactNode } from 'react';
import { themeCssVariables } from 'twenty-ui/theme';

import { readStockStyles } from 'src/stock/stock-theme';

export { ChoiceSelect } from 'src/shared/front-components/choice-select';
export { type ChoiceOption } from 'src/shared/front-components/types/choice-option.type';

// The translation extractor reads only front-component files: the title and
// labels come from the caller.
export const PopupPanel = ({ title, children }: { title: string; children: ReactNode }) => {
  const styles = readStockStyles();

  return (
    <div style={styles.panel}>
      <div style={styles.title}>{title}</div>
      {children}
    </div>
  );
};

export const FieldRow = ({ label, children }: { label: string; children: ReactNode }) => {
  const theme = themeCssVariables;

  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[1] }}>
      <span style={{ color: theme.font.color.secondary }}>{label}</span>
      {children}
    </label>
  );
};
