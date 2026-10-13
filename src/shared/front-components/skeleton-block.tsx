import { type CSSProperties } from 'react';
import { themeCssVariables } from 'twenty-ui/theme';

// A grey placeholder shape for content that is still loading. Twenty's UI
// package has no skeleton, so this follows the loading pattern of its design
// guide: theme radius and background tokens, the size of the final content.
// Give it a `width` and `height` (CSS lengths), or an `aspectRatio` with a
// `width`, so it keeps the shape of what will replace it. Hidden from screen
// readers: the parent says "busy".
export const SkeletonBlock = ({
  width = '100%',
  height,
  aspectRatio,
  style,
}: {
  width?: CSSProperties['width'];
  height?: CSSProperties['height'];
  aspectRatio?: CSSProperties['aspectRatio'];
  style?: CSSProperties;
}) => (
  <div
    aria-hidden="true"
    style={{
      boxSizing: 'border-box',
      width,
      height,
      aspectRatio,
      minWidth: 0,
      borderRadius: themeCssVariables.border.radius.sm,
      background: themeCssVariables.background.transparent.light,
      ...style,
    }}
  />
);
