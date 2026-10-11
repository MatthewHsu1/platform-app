import { describe, expect, it } from 'vitest';

import { type AppLeadWrite } from 'src/crm/lead/types/app-lead-write.type';
import { makeRunRecurringPlanTrigger } from 'src/crm/recurring-plan/run-recurring-plan-trigger';

const makeApi = (leadsByPlan: Record<string, string[]>) => {
  const writes: AppLeadWrite[][] = [];
  return {
    writes,
    api: {
      leadIdsWithPlans: async (planIds: string[]) => planIds.flatMap((id) => leadsByPlan[id] ?? []),
      writeLeads: async (batch: AppLeadWrite[]) => {
        writes.push(batch);
      },
    },
  };
};

describe('recurring plan trigger', () => {
  it('takes a deleted plan off its leads', async () => {
    const { api, writes } = makeApi({ p1: ['l1', 'l2'] });

    await makeRunRecurringPlanTrigger(api)({ operation: 'deleted', events: [{ recordId: 'p1', properties: {} }] });

    expect(writes).toEqual([
      [
        { leadId: 'l1', data: { recurringPlanId: null } },
        { leadId: 'l2', data: { recurringPlanId: null } },
      ],
    ]);
  });

  it('recomputes the monthly revenue of its leads when the number of months changes', async () => {
    const { api, writes } = makeApi({ p1: ['l1'] });

    await makeRunRecurringPlanTrigger(api)({
      operation: 'updated',
      events: [
        { recordId: 'p1', properties: { before: { numberOfMonths: 12 }, after: { numberOfMonths: 6 }, updatedFields: ['numberOfMonths'] } },
      ],
    });

    expect(writes).toEqual([[{ leadId: 'l1', data: {} }]]);
  });
});
