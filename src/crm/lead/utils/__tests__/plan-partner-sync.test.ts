import { describe, expect, it } from 'vitest';

import { type LeadRow } from 'src/crm/lead/types/lead-row.type';
import { type PartnerCompanyRow } from 'src/crm/lead/types/partner-company-row.type';
import { type PartnerPersonRow } from 'src/crm/lead/types/partner-person-row.type';
import { planPartnerSync, planPersonContactSync, planPersonPush } from 'src/crm/lead/utils/plan-partner-sync.util';

const EMPTY_ADDRESS = {
  addressStreet1: null,
  addressStreet2: null,
  addressCity: null,
  addressPostcode: null,
  addressState: null,
  addressCountry: null,
};

const lead = (patch: Partial<LeadRow> = {}) =>
  ({
    id: 'L',
    personId: null,
    companyId: null,
    contactName: null,
    partnerName: null,
    jobPosition: null,
    website: null,
    contactAddress: null,
    emailFrom: null,
    phone: null,
    ...patch,
  }) as LeadRow;

const person = (patch: Partial<PartnerPersonRow> = {}): PartnerPersonRow => ({
  id: 'P',
  name: { firstName: 'Amy', lastName: 'Wong' },
  emails: { primaryEmail: 'amy.wong@test.example.com', additionalEmails: [] },
  phones: { primaryPhoneNumber: '2025550888', primaryPhoneCallingCode: '+1', primaryPhoneCountryCode: 'US', additionalPhones: [] },
  jobTitle: 'Buyer',
  companyId: 'C',
  ...patch,
});

const company = (patch: Partial<PartnerCompanyRow> = {}): PartnerCompanyRow => ({
  id: 'C',
  name: 'Wong Gym',
  domainName: { primaryLinkUrl: 'https://wonggym.example.com', primaryLinkLabel: '', secondaryLinks: [] },
  address: { ...EMPTY_ADDRESS, addressStreet1: '1 Main St', addressCity: 'Columbus', addressCountry: 'United States' },
  ...patch,
});

const sync = (input: Partial<Parameters<typeof planPartnerSync>[0]>) =>
  planPartnerSync({
    lead: lead(),
    person: null,
    company: null,
    personCompany: null,
    changed: { person: true, company: true },
    protectedFields: new Set(),
    ...input,
  });

describe('planPartnerSync', () => {
  it('copies the contact and its company onto the lead', () => {
    expect(sync({ lead: lead({ personId: 'P', companyId: 'C' }), person: person(), company: company() })).toEqual({
      contactName: 'Amy Wong',
      partnerName: 'Wong Gym',
      jobPosition: 'Buyer',
      website: { primaryLinkUrl: 'https://wonggym.example.com', primaryLinkLabel: null, secondaryLinks: null },
      contactAddress: { ...EMPTY_ADDRESS, addressStreet1: '1 Main St', addressCity: 'Columbus', addressCountry: 'United States' },
      emailFrom: { primaryEmail: 'amy.wong@test.example.com', additionalEmails: null },
      phone: { primaryPhoneNumber: '2025550888', primaryPhoneCountryCode: 'US', primaryPhoneCallingCode: '+1', additionalPhones: null },
    });
  });

  it('takes the company name from the contact when the lead has no customer company', () => {
    expect(sync({ lead: lead({ personId: 'P' }), person: person(), personCompany: company({ name: 'Parent Co' }) })).toMatchObject({
      partnerName: 'Parent Co',
    });
  });

  it('keeps what staff typed in the same save', () => {
    const typed = lead({ personId: 'P', jobPosition: 'Parmesan Rappeur', emailFrom: { primaryEmail: 'typed@test.example.com', additionalEmails: null } });
    const result = sync({ lead: typed, person: person(), protectedFields: new Set(['jobPosition', 'emailFrom']) });

    expect(result).not.toHaveProperty('jobPosition');
    expect(result).not.toHaveProperty('emailFrom');
    expect(result).toMatchObject({ contactName: 'Amy Wong' });
  });

  it('keeps the lead contact name when the customer is a company only', () => {
    const result = sync({ lead: lead({ companyId: 'C', contactName: 'Test' }), company: company() });

    expect(result).toMatchObject({ partnerName: 'Wong Gym' });
    expect(result).not.toHaveProperty('contactName');
  });

  it('empties the contact and company names when both links are removed', () => {
    expect(sync({ lead: lead({ contactName: 'Amy Wong', partnerName: 'Wong Gym' }) })).toEqual({ contactName: null, partnerName: null });
  });

  it('keeps the contact name when the contact is removed but the company stays', () => {
    const result = sync({
      lead: lead({ companyId: 'C', contactName: 'Amy Wong', partnerName: 'Wong Gym' }),
      company: company(),
      changed: { person: true, company: false },
    });

    expect(result).not.toHaveProperty('contactName');
  });

  it('keeps the lead address and website when the company has none', () => {
    const typed = lead({
      companyId: 'C',
      website: { primaryLinkUrl: 'http://mywebsite.org', primaryLinkLabel: null, secondaryLinks: null },
      contactAddress: { ...EMPTY_ADDRESS, addressStreet1: 'My street', addressCountry: 'Belgium' },
    });
    const result = sync({ lead: typed, company: company({ domainName: null, address: { ...EMPTY_ADDRESS } }) });

    expect(result).not.toHaveProperty('website');
    expect(result).not.toHaveProperty('contactAddress');
  });

  it('copies the whole company address, empty parts too, when any part is set', () => {
    const typed = lead({ companyId: 'C', contactAddress: { ...EMPTY_ADDRESS, addressStreet1: 'My street', addressStreet2: 'My street', addressCity: 'My city' } });

    expect(sync({ lead: typed, company: company({ address: { ...EMPTY_ADDRESS, addressCountry: 'France' } }) })).toMatchObject({
      contactAddress: { ...EMPTY_ADDRESS, addressCountry: 'France' },
    });
  });

  it("takes the contact's own address before its company's", () => {
    const own = { ...EMPTY_ADDRESS, addressStreet1: '9 Elm St', addressCity: 'Dayton' };

    expect(sync({ lead: lead({ personId: 'P', companyId: 'C' }), person: person({ postalAddress: own }), company: company() })).toMatchObject({
      contactAddress: own,
    });
  });

  it("takes the contact's company address when the contact has none and the lead has no customer company", () => {
    expect(sync({ lead: lead({ personId: 'P' }), person: person({ postalAddress: { ...EMPTY_ADDRESS } }), personCompany: company() })).toMatchObject({
      contactAddress: { ...EMPTY_ADDRESS, addressStreet1: '1 Main St', addressCity: 'Columbus', addressCountry: 'United States' },
    });
  });

  it('keeps the lead job position when the contact has none', () => {
    expect(sync({ lead: lead({ personId: 'P', jobPosition: 'Owner' }), person: person({ jobTitle: null }) })).not.toHaveProperty('jobPosition');
  });

  it('does not copy an email or phone that differs only in form', () => {
    const typed = lead({
      personId: 'P',
      emailFrom: { primaryEmail: 'Amy.Wong@test.example.com', additionalEmails: null },
      phone: { primaryPhoneNumber: '(202) 555-0888', primaryPhoneCountryCode: 'US', primaryPhoneCallingCode: '+1', additionalPhones: null },
    });
    const result = sync({ lead: typed, person: person() });

    expect(result).not.toHaveProperty('emailFrom');
    expect(result).not.toHaveProperty('phone');
  });

  it('keeps the lead email when the contact has none', () => {
    const typed = lead({ personId: 'P', emailFrom: { primaryEmail: 'amy.wong@test.example.com', additionalEmails: null } });

    expect(sync({ lead: typed, person: person({ emails: { primaryEmail: '', additionalEmails: [] } }) })).not.toHaveProperty('emailFrom');
  });

  it('does nothing when neither link changed', () => {
    expect(sync({ lead: lead({ personId: 'P' }), person: person(), changed: { person: false, company: false } })).toEqual({});
  });

  it('leaves the contact fields alone when only the customer company of a lead with a contact changed', () => {
    const current = lead({ personId: 'P', companyId: 'C', contactName: 'Amy', jobPosition: 'Owner', partnerName: 'Old Co' });

    expect(sync({ lead: current, person: person(), company: company(), changed: { person: false, company: true } })).toEqual({
      partnerName: 'Wong Gym',
      website: { primaryLinkUrl: 'https://wonggym.example.com', primaryLinkLabel: null, secondaryLinks: null },
      contactAddress: { ...EMPTY_ADDRESS, addressStreet1: '1 Main St', addressCity: 'Columbus', addressCountry: 'United States' },
    });
  });
});

describe('planPersonContactSync', () => {
  it('brings a contact email and phone change to the lead', () => {
    const current = lead({ personId: 'P', emailFrom: { primaryEmail: 'old@test.example.com', additionalEmails: null } });

    expect(planPersonContactSync({ lead: current, person: person({ phones: null }) })).toEqual({
      emailFrom: { primaryEmail: 'amy.wong@test.example.com', additionalEmails: null },
    });
  });
});

describe('planPersonPush', () => {
  const linked = (patch: Partial<LeadRow>) => lead({ personId: 'P', ...patch });

  it('sends a typed lead email and phone to the contact', () => {
    expect(
      planPersonPush({
        lead: linked({
          emailFrom: { primaryEmail: 'john.zoidberg@test.example.com', additionalEmails: null },
          phone: { primaryPhoneNumber: '2025557799', primaryPhoneCountryCode: 'US', primaryPhoneCallingCode: '+1', additionalPhones: null },
        }),
        person: person(),
        written: new Set(['emailFrom', 'phone']),
      }),
    ).toEqual({
      personId: 'P',
      primaryEmail: 'john.zoidberg@test.example.com',
      phone: { primaryPhoneNumber: '2025557799', primaryPhoneCountryCode: 'US', primaryPhoneCallingCode: '+1', additionalPhones: [] },
    });
  });

  it('never empties the contact when the lead value is cleared', () => {
    expect(
      planPersonPush({ lead: linked({ emailFrom: { primaryEmail: '', additionalEmails: null }, phone: null }), person: person(), written: new Set(['emailFrom', 'phone']) }),
    ).toBeNull();
  });

  it('sends nothing for a change of form only', () => {
    expect(
      planPersonPush({ lead: linked({ emailFrom: { primaryEmail: 'AMY.WONG@test.example.com', additionalEmails: null } }), person: person(), written: new Set(['emailFrom']) }),
    ).toBeNull();
  });

  it('sends nothing when the save did not write the email or phone', () => {
    expect(
      planPersonPush({ lead: linked({ emailFrom: { primaryEmail: 'other@test.example.com', additionalEmails: null } }), person: person(), written: new Set(['personId']) }),
    ).toBeNull();
  });

  it('sends nothing without a contact', () => {
    expect(planPersonPush({ lead: lead({ emailFrom: { primaryEmail: 'x@test.example.com', additionalEmails: null } }), person: null, written: new Set(['emailFrom']) })).toBeNull();
  });
});
