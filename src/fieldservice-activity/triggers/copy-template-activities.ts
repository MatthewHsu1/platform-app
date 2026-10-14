import { type ObjectRecordEvent } from 'twenty-sdk/define';

import { fsmOrders } from 'src/fieldservice/fieldservice-records';
import { fsmActivities } from 'src/fieldservice-activity/fieldservice-activity-records';
import { type ActivityRow } from 'src/fieldservice-activity/types/activity-row.type';
import { planActivityCopy } from 'src/fieldservice-activity/utils/plan-activity-copy.util';
import { updatedFieldsOf } from 'src/shared/triggers/event-values';
import { findMany } from 'src/shared/triggers/records';
import { errorCollector } from 'src/shared/triggers/retry-on-conflict';

type RawEvent = ObjectRecordEvent<Record<string, unknown>>;

const ACTIVITY_SELECTION = 'id name required sequence ref state createdAt';

// An order made with a template, or saved with another one, drops its checklist and takes a copy of the template's.
// Orders are read again, so the copy follows the stored template whatever the event said. The app's own writes count
// too: an order another module makes with a template gets its checklist. The items are written by the app, as they
// are never typed by a person.
export const copyTemplateActivities = async (operation: 'created' | 'updated', events: RawEvent[]) => {
  const candidateIds = [
    ...new Set(
      events
        .filter((event) => operation === 'created' || updatedFieldsOf(event).includes('templateId'))
        .map((event) => event.recordId),
    ),
  ];
  const orders = (await fsmOrders.find<{ id: string; templateId: string | null }>({ id: { in: candidateIds } }, 'id templateId')).filter(
    (order) => order.templateId !== null,
  );

  if (orders.length === 0) {
    return;
  }
  const found = await findMany<{ templateItems: (ActivityRow & { fsmTemplateId: string })[]; orderItems: (ActivityRow & { fsmOrderId: string })[] }>({
    templateItems: {
      of: fsmActivities,
      filter: { fsmTemplateId: { in: orders.map((order) => order.templateId) } },
      selection: `${ACTIVITY_SELECTION} fsmTemplateId`,
    },
    orderItems: { of: fsmActivities, filter: { fsmOrderId: { in: orders.map((order) => order.id) } }, selection: `${ACTIVITY_SELECTION} fsmOrderId` },
  });
  const errors = errorCollector();

  for (const order of orders) {
    await errors.run(order.id, async () => {
      const plan = planActivityCopy({
        templateId: order.templateId,
        templateChanged: true,
        templateActivities: found.templateItems.filter((item) => item.fsmTemplateId === order.templateId),
        existing: found.orderItems.filter((item) => item.fsmOrderId === order.id),
      });

      if (plan.destroyIds.length > 0) {
        await fsmActivities.destroyMany(plan.destroyIds);
      }
      if (plan.create.length > 0) {
        await fsmActivities.createMany(plan.create.map((copy) => ({ ...copy, fsmOrderId: order.id })));
      }
    });
  }
  errors.throwIfAny();
};
