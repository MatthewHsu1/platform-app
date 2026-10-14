import { type ActivityRow } from 'src/fieldservice-activity/types/activity-row.type';

// The order a checklist reads in: by sequence, then by when the item was made.
export const sortActivities = (activities: ActivityRow[]): ActivityRow[] =>
  [...activities].sort(
    (left, right) =>
      (left.sequence ?? 0) - (right.sequence ?? 0) || left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id),
  );
