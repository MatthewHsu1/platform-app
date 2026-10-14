import { ACTIVITY_STATE } from 'src/fieldservice-activity/fieldservice-activity-options.constant';
import { type ActivityRow } from 'src/fieldservice-activity/types/activity-row.type';
import { sortActivities } from 'src/fieldservice-activity/utils/sort-activities.util';

// The first required item still to do stops its order from completing. A cancelled required item does not.
export const findBlockingActivity = (activities: ActivityRow[]): ActivityRow | null =>
  sortActivities(activities).find((activity) => activity.required === true && activity.state === ACTIVITY_STATE.TODO) ?? null;
