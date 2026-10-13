import { describe, expect, it } from 'vitest';

import { planCustomerTarget } from 'src/crm/lead/actions/utils/plan-customer-target.util';
import { leadRow } from 'src/crm/lead/merge/utils/__tests__/fixtures/lead-row.fixture';

const lead = (personId: string | null, companyId: string | null = null) =>
  leadRow({ id: 'lead', createdAt: '2026-02-01T00:00:00.000Z', personId, companyId });

describe('planCustomerTarget', () => {
  it.each([
    // lead contact, chosen contact, action, expected
    [null, null, 'CREATE', { kind: 'create' }],
    [null, null, 'EXIST', { kind: 'none' }],
    ['lead-partner', null, 'CREATE', { kind: 'keep' }],
    ['lead-partner', null, 'EXIST', { kind: 'keep' }],
    [null, 'wizard-contact', 'CREATE', { kind: 'person', personId: 'wizard-contact' }],
    [null, 'wizard-contact', 'EXIST', { kind: 'person', personId: 'wizard-contact' }],
    ['lead-partner', 'wizard-contact', 'EXIST', { kind: 'person', personId: 'wizard-contact' }],
  ] as const)('lead contact %s, chosen %s, %s → %o', (leadPersonId, chosenPersonId, action, expected) => {
    expect(planCustomerTarget({ lead: lead(leadPersonId), action, chosenPersonId, personByEmailId: null })).toEqual(expected);
  });

  it('keeps a lead whose customer is a company only', () => {
    expect(planCustomerTarget({ lead: lead(null, 'company-1'), action: 'CREATE', chosenPersonId: null, personByEmailId: null })).toEqual({
      kind: 'keep',
    });
  });

  it('links each lead to the contact found by its email, else creates one, when converting many', () => {
    expect(
      planCustomerTarget({ lead: lead(null), action: 'EACH_EXIST_OR_CREATE', chosenPersonId: 'ignored', personByEmailId: 'by-email' }),
    ).toEqual({ kind: 'person', personId: 'by-email' });
    expect(
      planCustomerTarget({ lead: lead(null), action: 'EACH_EXIST_OR_CREATE', chosenPersonId: null, personByEmailId: null }),
    ).toEqual({ kind: 'create' });
    expect(
      planCustomerTarget({ lead: lead('own'), action: 'EACH_EXIST_OR_CREATE', chosenPersonId: null, personByEmailId: 'by-email' }),
    ).toEqual({ kind: 'keep' });
  });
});
