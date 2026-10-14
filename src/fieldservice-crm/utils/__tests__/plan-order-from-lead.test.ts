import { describe, expect, it } from 'vitest';

import { planOrderFromLead } from 'src/fieldservice-crm/utils/plan-order-from-lead.util';

const opportunity = { id: 'lead-1', leadType: 'OPPORTUNITY', fsmLocationId: 'site', description: 'Treadmill belt slips', priority: 'VERY_HIGH' };

describe('planOrderFromLead', () => {
  it('makes an order at the opportunity location with its description and the matching priority', () => {
    expect(planOrderFromLead(opportunity)).toEqual({
      kind: 'write',
      data: { opportunityId: 'lead-1', locationId: 'site', priority: 'URGENT', description: { markdown: 'Treadmill belt slips' } },
    });
  });

  it('maps the lowest opportunity priority to a normal order', () => {
    expect(planOrderFromLead({ ...opportunity, priority: 'LOW', description: null })).toEqual({
      kind: 'write',
      data: { opportunityId: 'lead-1', locationId: 'site', priority: 'NORMAL' },
    });
  });

  it('refuses a lead and an opportunity without a service location', () => {
    expect(planOrderFromLead({ ...opportunity, leadType: 'LEAD' })).toEqual({
      kind: 'refuse',
      reason: 'Service orders are made from opportunities, not from leads.',
    });
    expect(planOrderFromLead({ ...opportunity, fsmLocationId: null })).toEqual({
      kind: 'refuse',
      reason: 'Set the service location of the opportunity first.',
    });
  });
});
