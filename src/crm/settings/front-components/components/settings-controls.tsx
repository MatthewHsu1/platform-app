import { type CSSProperties, type ReactNode } from 'react';
import { themeCssVariables } from 'twenty-ui/theme';

// Theme tokens are read inside a component, never at module level, where they break the app build.
export const readSettingsStyles = () => {
  const theme = themeCssVariables;
  const styles: Record<'page' | 'row' | 'column' | 'label' | 'muted', CSSProperties> = {
    page: { display: 'flex', flexDirection: 'column', gap: theme.spacing[6], fontFamily: theme.font.family, width: '100%' },
    row: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: theme.spacing[3], padding: `${theme.spacing[2]} ${theme.spacing[3]}` },
    column: { display: 'flex', flexDirection: 'column', gap: theme.spacing[1], padding: `${theme.spacing[2]} ${theme.spacing[3]}` },
    label: { color: theme.font.color.primary, fontSize: theme.font.size.md, display: 'flex', alignItems: 'center', gap: theme.spacing[2] },
    muted: { color: theme.font.color.tertiary, fontSize: theme.font.size.md, margin: 0 },
  };

  return styles;
};

export const Toggle = ({
  label,
  help,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  help?: string;
  checked: boolean;
  disabled: boolean;
  onChange: (value: boolean) => void;
}) => {
  const styles = readSettingsStyles();

  return (
    <div style={styles.column}>
      <label style={styles.label}>
        <input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} />
        {label}
      </label>
      {help === undefined ? null : <span style={styles.muted}>{help}</span>}
    </div>
  );
};

export const Row = ({ label, children }: { label: string; children: ReactNode }) => {
  const styles = readSettingsStyles();

  return (
    <div style={styles.row}>
      <span style={{ ...styles.label, minWidth: 160 }}>{label}</span>
      {children}
    </div>
  );
};
