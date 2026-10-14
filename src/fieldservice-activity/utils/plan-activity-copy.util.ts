import { ACTIVITY_STATE } from 'src/fieldservice-activity/fieldservice-activity-options.constant';
import { type ActivityCopyInput } from 'src/fieldservice-activity/types/activity-copy-input.type';
import { type ActivityCopyPlan } from 'src/fieldservice-activity/types/activity-copy-plan.type';
import { type ActivityRow } from 'src/fieldservice-activity/types/activity-row.type';
import { sortActivities } from 'src/fieldservice-activity/utils/sort-activities.util';

const sameItem = (left: ActivityRow, right: ActivityRow) =>
  left.name === right.name && Boolean(left.required) === Boolean(right.required) && (left.sequence ?? 0) === (right.sequence ?? 0) && left.ref === right.ref;

// An order that gets a template (made with it, or saved with another) drops its items and takes one copy of each
// template item. An order with no template keeps what it has. Items that already match the template's are left
// alone, so a second pass writes nothing and keeps the progress made meanwhile.
export const planActivityCopy = ({ templateId, templateChanged, templateActivities, existing }: ActivityCopyInput): ActivityCopyPlan => {
  if (templateId === null || !templateChanged) {
    return { destroyIds: [], create: [] };
  }
  const wanted = sortActivities(templateActivities);
  const held = sortActivities(existing);

  if (wanted.length === held.length && wanted.every((item, position) => sameItem(item, held[position]))) {
    return { destroyIds: [], create: [] };
  }
  return {
    destroyIds: held.map((item) => item.id),
    create: wanted.map((item) => ({
      name: item.name,
      required: Boolean(item.required),
      sequence: item.sequence ?? 0,
      ref: item.ref,
      state: ACTIVITY_STATE.TODO,
    })),
  };
};
