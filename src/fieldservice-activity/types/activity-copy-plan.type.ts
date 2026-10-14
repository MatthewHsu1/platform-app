import { type ActivityCopy } from 'src/fieldservice-activity/types/activity-copy.type';

// The order's items to remove and the items to make in their place. Both empty: nothing to write.
export type ActivityCopyPlan = { destroyIds: string[]; create: ActivityCopy[] };
