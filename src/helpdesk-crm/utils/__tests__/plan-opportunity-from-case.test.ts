import { describe, expect, it } from 'vitest';

import { planOpportunityFromCase } from 'src/helpdesk-crm/utils/plan-opportunity-from-case.util';
import { caseRow } from 'src/helpdesk/utils/__tests__/case-fixtures';

const theCase = caseRow({
  id: 'case1',
  name: 'Test ticket',
  description: { markdown: 'Test description', blocknote: null },
  personId: 'partner',
  assignedUserId: 'saleUser',
});

describe('planOpportunityFromCase', () => {
  it('makes an opportunity named after the case, for its contact, with its description, linked to it', () => {
    expect(planOpportunityFromCase({ case: theCase, salespersonId: null, crmTeamId: 'team' })).toEqual({
      name: 'Test ticket',
      leadType: 'OPPORTUNITY',
      personId: 'partner',
      salespersonId: 'saleUser',
      teamId: 'team',
      description: { markdown: 'Test description', blocknote: null },
      ticketId: 'case1',
    });
  });

  it('gives the opportunity to the chosen salesperson over the case assignee', () => {
    expect(planOpportunityFromCase({ case: theCase, salespersonId: 'other', crmTeamId: null })).toMatchObject({
      salespersonId: 'other',
      teamId: null,
    });
  });
});
