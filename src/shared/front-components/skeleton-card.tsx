import { type CSSProperties } from 'react';
import { themeCssVariables } from 'twenty-ui/theme';

import { SkeletonBlock } from 'src/shared/front-components/skeleton-block';

// A framed placeholder for one card of a grid: a title line and `lines`
// shorter lines. It is `aspectRatio` high for its width (square by default), so
// a grid of them has the shape of the final cards. Pass the same `style` the
// final card uses for its frame, and keep them in one grid.
export const SkeletonCard = ({
  lines = 3,
  aspectRatio = '1 / 1',
  style,
}: {
  lines?: number;
  aspectRatio?: CSSProperties['aspectRatio'];
  style?: CSSProperties;
}) => (
  <div
    aria-hidden="true"
    style={{
      boxSizing: 'border-box',
      minWidth: 0,
      aspectRatio,
      padding: themeCssVariables.spacing[3],
      display: 'flex',
      flexDirection: 'column',
      gap: themeCssVariables.spacing[2],
      border: `1px solid ${themeCssVariables.border.color.light}`,
      borderRadius: themeCssVariables.border.radius.md,
      background: themeCssVariables.background.secondary,
      ...style,
    }}
  >
    <SkeletonBlock width="60%" height={themeCssVariables.spacing[6]} />
    {Array.from({ length: lines }, (_, index) => (
      <SkeletonBlock key={index} height={themeCssVariables.spacing[4]} />
    ))}
  </div>
);
