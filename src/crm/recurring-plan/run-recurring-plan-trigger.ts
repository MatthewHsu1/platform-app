import { type AppLeadWrite } from 'src/crm/lead/types/app-lead-write.type';
import { type RecordOperation } from 'src/shared/triggers/batch-events';

type PlanEvent = {
  recordId: string;
  properties: { before?: Record<string, unknown>; after?: Record<string, unknown>; updatedFields?: string[] };
};

type RecurringPlanTriggerApi = {
  leadIdsWithPlans: (planIds: string[]) => Promise<string[]>;
  writeLeads: (writes: AppLeadWrite[]) => Promise<unknown>;
};

export const makeRunRecurringPlanTrigger =
  (api: RecurringPlanTriggerApi) =>
  async ({ operation, events }: { operation: RecordOperation; events: PlanEvent[] }) => {
    // A deleted plan leaves its leads without one, whoever deleted it; their
    // monthly revenue is computed again in the same write.
    if (operation === 'deleted') {
      const leadIds = await api.leadIdsWithPlans(events.map((event) => event.recordId));

      if (leadIds.length > 0) {
        await api.writeLeads(leadIds.map((leadId) => ({ leadId, data: { recurringPlanId: null } })));
      }
      return;
    }
    if (operation !== 'updated') {
      return;
    }
    const resized = events
      .filter(
        (event) =>
          (event.properties.updatedFields ?? []).includes('numberOfMonths') &&
          event.properties.before?.numberOfMonths !== event.properties.after?.numberOfMonths,
      )
      .map((event) => event.recordId);

    if (resized.length > 0) {
      const leadIds = await api.leadIdsWithPlans(resized);

      if (leadIds.length > 0) {
        await api.writeLeads(leadIds.map((leadId) => ({ leadId, data: {} })));
      }
    }
  };
