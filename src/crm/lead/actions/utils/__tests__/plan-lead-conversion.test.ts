import { describe, expect, it } from 'vitest';

import { planLeadConversion } from 'src/crm/lead/actions/utils/plan-lead-conversion.util';
import { type LeadToConvert } from 'src/crm/lead/actions/utils/types/lead-to-convert.type';

const NOW = '2026-10-06T15:00:00.000Z';

const lead = (overrides: Partial<LeadToConvert> = {}): LeadToConvert => ({
  id: 'lead-1',
  name: 'Gym fit-out, 12 treadmills',
  leadType: 'LEAD',
  wonStatus: 'PENDING',
  personId: null,
  companyId: null,
  contactName: 'Jane Q Doe',
  partnerName: 'Northside Fitness',
  jobPosition: 'Owner',
  emailFrom: { primaryEmail: 'jane@northside.example' },
  phone: {
    primaryPhoneNumber: '5551234567',
    primaryPhoneCountryCode: 'US',
    primaryPhoneCallingCode: '+1',
  },
  website: { primaryLinkUrl: 'https://northside.example' },
  contactAddress: { addressCity: 'Chicago', addressCountry: 'United States' },
  ...overrides,
});

describe('planLeadConversion', () => {
  it('turns a lead into an opportunity and makes its company, then its contact in that company', () => {
    const plan = planLeadConversion({ lead: lead(), foundPersonId: null, foundCompanyId: null, now: NOW });

    expect(plan).toEqual({
      kind: 'convert',
      company: {
        create: {
          name: 'Northside Fitness',
          address: { addressCity: 'Chicago', addressCountry: 'United States' },
          domainName: { primaryLinkUrl: 'https://northside.example' },
        },
      },
      person: {
        create: {
          name: { firstName: 'Jane Q', lastName: 'Doe' },
          emails: { primaryEmail: 'jane@northside.example' },
          phones: {
            primaryPhoneNumber: '5551234567',
            primaryPhoneCountryCode: 'US',
            primaryPhoneCallingCode: '+1',
          },
          jobTitle: 'Owner',
        },
      },
      leadUpdate: { leadType: 'OPPORTUNITY', dateConversion: NOW },
    });
  });

  it('links the person found by email and the company found by name instead of making new ones', () => {
    const plan = planLeadConversion({
      lead: lead(),
      foundPersonId: 'person-9',
      foundCompanyId: 'company-4',
      now: NOW,
    });

    expect(plan).toMatchObject({
      kind: 'convert',
      company: { id: 'company-4' },
      person: { id: 'person-9' },
    });
  });

  it('keeps the contact and customer already on the lead', () => {
    const plan = planLeadConversion({
      lead: lead({ personId: 'person-1', companyId: 'company-1' }),
      foundPersonId: 'person-9',
      foundCompanyId: 'company-4',
      now: NOW,
    });

    expect(plan).toMatchObject({ company: { id: 'company-1' }, person: { id: 'person-1' } });
  });

  it('makes only the company when the lead has a company name but no contact name', () => {
    const plan = planLeadConversion({
      lead: lead({ contactName: null, emailFrom: null }),
      foundPersonId: null,
      foundCompanyId: null,
      now: NOW,
    });

    expect(plan).toMatchObject({ company: { create: { name: 'Northside Fitness' } }, person: null });
  });

  it('makes a contact named after the lead when it has no contact or company name', () => {
    const plan = planLeadConversion({
      lead: lead({ contactName: '  ', partnerName: null, name: 'Walk-in' }),
      foundPersonId: null,
      foundCompanyId: null,
      now: NOW,
    });

    expect(plan).toMatchObject({
      company: null,
      person: { create: { name: { firstName: 'Walk-in', lastName: '' } } },
    });
  });

  it('refuses an opportunity, a won lead and a lost lead', () => {
    const args = { foundPersonId: null, foundCompanyId: null, now: NOW };

    expect(planLeadConversion({ ...args, lead: lead({ leadType: 'OPPORTUNITY' }) })).toEqual({
      kind: 'refuse',
      reason: 'This lead is already an opportunity.',
    });
    expect(planLeadConversion({ ...args, lead: lead({ wonStatus: 'WON' }) })).toEqual({
      kind: 'refuse',
      reason: 'A won lead cannot be converted.',
    });
    expect(planLeadConversion({ ...args, lead: lead({ wonStatus: 'LOST' }) })).toEqual({
      kind: 'refuse',
      reason: 'A lost lead cannot be converted. Restore it first.',
    });
  });
});
