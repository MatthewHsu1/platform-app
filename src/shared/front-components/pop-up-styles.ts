import { type CSSProperties } from 'react';
import { themeCssVariables } from 'twenty-ui/theme';

// Call inside a component: theme values read at module level break app:publish.
export const readPopUpStyles = () => {
  const theme = themeCssVariables;
  const styles: Record<'panel' | 'title' | 'error' | 'buttons', CSSProperties> = {
    panel: {
      fontFamily: theme.font.family,
      fontSize: theme.font.size.md,
      color: theme.font.color.primary,
      padding: theme.spacing[4],
      display: 'flex',
      flexDirection: 'column',
      gap: theme.spacing[2],
    },
    title: { fontWeight: 600 },
    error: { color: theme.color.red },
    buttons: { display: 'flex', justifyContent: 'flex-end', gap: theme.spacing[2] },
  };

  return styles;
};
