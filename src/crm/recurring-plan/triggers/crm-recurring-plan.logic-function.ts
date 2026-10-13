import { type DatabaseEventBatchPayload, defineLogicFunction, type ObjectRecordEvent } from 'twenty-sdk/define';

import { CRM_RECURRING_PLAN_TRIGGER_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER } from 'src/crm/crm-universal-identifiers.constant';
import { writeLeadsAsApplication } from 'src/crm/lead/write-leads-as-application';
import { makeRunRecurringPlanTrigger } from 'src/crm/recurring-plan/run-recurring-plan-trigger';
import { readEvents } from 'src/shared/triggers/batch-events';
import { records } from 'src/shared/triggers/records';

const leads = records('crmLead', 'crmLeads');

const runRecurringPlanTrigger = makeRunRecurringPlanTrigger({
  leadIdsWithPlans: async (planIds) => (await leads.find<{ id: string }>({ recurringPlanId: { in: planIds } }, 'id')).map((lead) => lead.id),
  writeLeads: (writes) => writeLeadsAsApplication(writes),
});

const handler = async (payload: DatabaseEventBatchPayload<ObjectRecordEvent<Record<string, unknown>>>) => {
  const { operation, events } = readEvents(payload);

  await runRecurringPlanTrigger({ operation, events });

  return {};
};

export default defineLogicFunction({
  universalIdentifier: CRM_RECURRING_PLAN_TRIGGER_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'platform-crm-recurring-plan',
  description: "Takes a deleted plan off its leads and recomputes the leads' monthly revenue when a plan's months change.",
  timeoutSeconds: 300,
  handler,
  databaseEventTriggerSettings: { eventName: 'crmRecurringPlan.*', batchMode: true },
});
