import { type ActivityRow } from 'src/fieldservice-activity/types/activity-row.type';

// What the copy decision reads: the template the order now has, whether that is a new pick (the order was just
// made with it, or the save changed it), the template's items and the items the order holds.
export type ActivityCopyInput = {
  templateId: string | null;
  templateChanged: boolean;
  templateActivities: ActivityRow[];
  existing: ActivityRow[];
};
