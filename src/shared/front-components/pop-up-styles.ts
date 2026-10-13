import { type CSSProperties } from 'react';
import { themeCssVariables } from 'twenty-ui/theme';

// Call inside a component: theme values read at module level break app:publish.
export const readPopUpStyles = () => {
  const theme = themeCssVariables;
  const styles: Record<
    'panel' | 'title' | 'error' | 'buttons' | 'card' | 'cell' | 'headerCell' | 'link' | 'muted' | 'row',
    CSSProperties
  > = {
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
    error: { color: theme.color.red, whiteSpace: 'pre-wrap' },
    muted: { color: theme.font.color.tertiary },
    row: { display: 'flex', gap: theme.spacing[2], alignItems: 'center', flexWrap: 'wrap' },
    card: {
      border: `1px solid ${theme.border.color.medium}`,
      borderRadius: theme.border.radius.md,
      background: theme.background.secondary,
      padding: theme.spacing[3],
      display: 'flex',
      flexDirection: 'column',
      gap: theme.spacing[2],
    },
    cell: {
      padding: `${theme.spacing[1]} ${theme.spacing[2]}`,
      borderBottom: `1px solid ${theme.border.color.light}`,
      textAlign: 'left',
    },
    headerCell: {
      padding: `${theme.spacing[1]} ${theme.spacing[2]}`,
      borderBottom: `1px solid ${theme.border.color.medium}`,
      textAlign: 'left',
      color: theme.font.color.secondary,
      fontWeight: theme.font.weight.medium,
    },
    link: {
      color: theme.color.blue,
      cursor: 'pointer',
      textDecoration: 'underline',
      background: 'none',
      border: 'none',
      padding: 0,
      font: 'inherit',
    },
    buttons: { display: 'flex', justifyContent: 'flex-end', gap: theme.spacing[2] },
  };

  return styles;
};
