import { type CSSProperties } from 'react';
import { themeCssVariables } from 'twenty-ui/theme';

import { readPopUpStyles } from 'src/shared/front-components/pop-up-styles';

// Call inside a component: theme values read at module level break app:publish.
export const readStockStyles = () => {
  const theme = themeCssVariables;
  const styles: Record<'row' | 'select', CSSProperties> = {
    row: { display: 'flex', alignItems: 'center', gap: theme.spacing[2] },
    select: {
      height: 32,
      padding: `0 ${theme.spacing[2]}`,
      borderRadius: theme.border.radius.sm,
      border: `1px solid ${theme.border.color.medium}`,
      background: theme.background.transparent.lighter,
      color: theme.font.color.primary,
      fontFamily: theme.font.family,
      fontSize: theme.font.size.md,
      outline: 'none',
    },
  };

  return { ...readPopUpStyles(), ...styles };
};
