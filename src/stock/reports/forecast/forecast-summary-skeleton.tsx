import { themeCssVariables } from 'twenty-ui/theme';

import { SkeletonBlock } from 'src/shared/front-components/skeleton-block';
import { SkeletonCard } from 'src/shared/front-components/skeleton-card';
import { readSummaryGrids } from 'src/stock/reports/forecast/forecast-summary-grids';

// What the summary report shows while it loads: the same grids, with a placeholder in the place of each block.
export const ForecastSummarySkeleton = ({ label }: { label: string }) => {
  const theme = themeCssVariables;
  const grids = readSummaryGrids();

  return (
    <div role="status" aria-busy="true" aria-label={label} style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[4] }}>
      <SkeletonBlock width="40%" height={theme.spacing[6]} />
      <div style={grids.metrics}>
        {Array.from({ length: 5 }, (_, index) => (
          <SkeletonCard key={index} lines={2} aspectRatio="auto" />
        ))}
      </div>
      <div style={grids.graphAndDates}>
        <SkeletonCard lines={6} aspectRatio="auto" />
        <SkeletonCard lines={4} aspectRatio="auto" />
      </div>
      <SkeletonCard lines={3} aspectRatio="auto" />
      <div style={grids.breakdownAndSum}>
        <SkeletonCard lines={4} aspectRatio="auto" />
        <SkeletonCard lines={3} aspectRatio="auto" />
      </div>
    </div>
  );
};
