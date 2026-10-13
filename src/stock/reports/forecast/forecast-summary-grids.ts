import { type CSSProperties } from 'react';
import { themeCssVariables } from 'twenty-ui/theme';

// The three grids of the summary report. The loading skeleton uses the same ones, so it has the shape of the report.
// Call inside a component: theme values read at module level break app:publish.
export const readSummaryGrids = () => {
  const theme = themeCssVariables;
  const grid = (minimum: string): CSSProperties => ({
    display: 'grid',
    gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${minimum}), 1fr))`,
    gap: theme.spacing[3],
    alignItems: 'start',
  });

  return { metrics: grid('9rem'), graphAndDates: grid('18rem'), breakdownAndSum: grid('16rem') };
};
