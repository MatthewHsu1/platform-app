import { describe, expect, it } from 'vitest';

import { planCustomerRights } from 'src/crm/lead/actions/utils/plan-customer-rights.util';
import { leadRow } from 'src/crm/lead/merge/utils/__tests__/fixtures/lead-row.fixture';

const lead = leadRow({
  id: 'lead-1',
  createdAt: '2026-02-01T00:00:00.000Z',
  name: 'Treadmills',
  contactName: 'Jane Doe',
  partnerName: 'Northside Fitness',
  emailFrom: { primaryEmail: 'jane@northside.example', additionalEmails: null },
});

const rights = (overrides: Partial<Parameters<typeof planCustomerRights>[0]>) =>
  planCustomerRights({
    lead,
    action: 'EACH_EXIST_OR_CREATE',
    chosenPersonId: null,
    chosenCompanyId: null,
    personByEmailId: null,
    ...overrides,
  });

describe('planCustomerRights', () => {
  it('asks for the contact and company rights when the lead becomes a new contact inside a new company', () => {
    expect(rights({})).toEqual(['person', 'company']);
    expect(rights({ action: 'CREATE' })).toEqual(['person', 'company']);
  });

  it('asks for the company right alone when the lead names a company but no contact', () => {
    expect(rights({ lead: { ...lead, contactName: null, emailFrom: { primaryEmail: 'info@northside.example', additionalEmails: null } } })).toEqual([
      'company',
    ]);
  });

  it('asks for the contact right alone when the contact goes into a company chosen in the dialog', () => {
    expect(rights({ action: 'CREATE', chosenCompanyId: 'company-1' })).toEqual(['person']);
  });

  it('asks for nothing when the lead is linked to an existing contact or keeps its customer', () => {
    expect(rights({ personByEmailId: 'person-9' })).toEqual([]);
    expect(rights({ action: 'EXIST', chosenPersonId: 'person-9' })).toEqual([]);
    expect(rights({ lead: { ...lead, companyId: 'company-1' } })).toEqual([]);
  });
});
