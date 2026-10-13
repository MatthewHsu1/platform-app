import { describe, expect, it } from 'vitest';

import { contactNameFromEmail } from 'src/crm/lead/actions/utils/contact-name-from-email.util';
import { planCreateCustomer, planCustomerCompany } from 'src/crm/lead/actions/utils/plan-create-customer.util';
import { leadRow } from 'src/crm/lead/merge/utils/__tests__/fixtures/lead-row.fixture';

const base = leadRow({
  id: 'lead-1',
  createdAt: '2026-02-01T00:00:00.000Z',
  name: 'Gym fit-out, 12 treadmills',
  salespersonId: 'user-lead',
  contactName: 'Jane Q Doe',
  partnerName: 'Northside Fitness',
  jobPosition: 'Owner',
  emailFrom: { primaryEmail: 'jane@northside.example', additionalEmails: null },
  phone: { primaryPhoneNumber: '5551234567', primaryPhoneCountryCode: 'US', primaryPhoneCallingCode: '+1', additionalPhones: null },
  website: { primaryLinkUrl: 'https://northside.example', primaryLinkLabel: null, secondaryLinks: null },
  contactAddress: {
    addressStreet1: '1 Main St',
    addressStreet2: null,
    addressCity: 'Chicago',
    addressPostcode: '60601',
    addressState: 'IL',
    addressCountry: 'United States',
  },
});

const PERSON = {
  name: { firstName: 'Jane Q', lastName: 'Doe' },
  emails: { primaryEmail: 'jane@northside.example' },
  phones: { primaryPhoneNumber: '5551234567', primaryPhoneCountryCode: 'US', primaryPhoneCallingCode: '+1' },
  jobTitle: 'Owner',
  postalAddress: base.contactAddress,
};

describe('planCreateCustomer', () => {
  it('makes the company from the company name, then the contact inside it', () => {
    expect(planCreateCustomer({ lead: base, chosenCompanyId: null, companyIdByName: null, existingCompanyAddress: null, salespersonId: null })).toEqual({
      company: {
        create: {
          name: 'Northside Fitness',
          address: base.contactAddress,
          domainName: { primaryLinkUrl: 'https://northside.example' },
          accountOwnerId: 'user-lead',
        },
      },
      person: { create: PERSON },
    });
  });

  it("uses a company that already has exactly that name, and puts the new contact at that company's address", () => {
    const companyAddress = { ...base.contactAddress!, addressStreet1: '5 Harbor Rd', addressCity: 'Boston', addressState: 'MA' };

    expect(
      planCreateCustomer({ lead: base, chosenCompanyId: null, companyIdByName: 'company-9', existingCompanyAddress: companyAddress, salespersonId: null }),
    ).toEqual({
      company: { id: 'company-9' },
      person: { create: { ...PERSON, postalAddress: companyAddress } },
    });
  });

  it("uses the company that holds the lead's website when none has its company name, at that company's address", () => {
    const companyAddress = { ...base.contactAddress!, addressStreet1: '5 Harbor Rd', addressCity: 'Boston', addressState: 'MA' };

    expect(
      planCreateCustomer({
        lead: base,
        chosenCompanyId: null,
        companyIdByName: null,
        companyIdByWebsite: 'company-web',
        existingCompanyAddress: companyAddress,
        salespersonId: null,
      }),
    ).toEqual({
      company: { id: 'company-web' },
      person: { create: { ...PERSON, postalAddress: companyAddress } },
    });
  });

  it("gives a contact inside the company chosen in the dialog that company's address, none when it has none", () => {
    const companyAddress = { ...base.contactAddress!, addressStreet1: '5 Harbor Rd' };
    const plan = (address: typeof companyAddress | null) =>
      planCreateCustomer({ lead: base, chosenCompanyId: 'company-chosen', companyIdByName: null, existingCompanyAddress: address, salespersonId: null });

    expect(plan(companyAddress).person?.create.postalAddress).toEqual(companyAddress);
    const { postalAddress: _leadAddress, ...withoutAddress } = PERSON;

    expect(plan(null).person?.create).toEqual(withoutAddress);
  });

  it('puts the contact in the company chosen in the dialog, before any company name', () => {
    expect(planCreateCustomer({ lead: base, chosenCompanyId: 'company-chosen', companyIdByName: 'company-9', existingCompanyAddress: null, salespersonId: null }).company).toEqual({
      id: 'company-chosen',
    });
  });

  it("puts a contact made for a lead whose customer is a company, with no company name, in that company at its address", () => {
    const lead = { ...base, partnerName: null, companyId: 'company-7' };
    const companyAddress = { ...base.contactAddress!, addressStreet1: '9 Lake Shore Dr' };

    expect(planCustomerCompany({ lead, chosenCompanyId: null, companyIdByName: null })).toEqual({ id: 'company-7' });
    expect(
      planCreateCustomer({ lead, chosenCompanyId: null, companyIdByName: null, existingCompanyAddress: companyAddress, salespersonId: null }),
    ).toEqual({ company: { id: 'company-7' }, person: { create: { ...PERSON, postalAddress: companyAddress } } });
  });

  it('makes the company the customer when there is no contact name', () => {
    const lead = { ...base, contactName: null, emailFrom: { primaryEmail: 'info@northside.example', additionalEmails: null } };

    expect(planCreateCustomer({ lead, chosenCompanyId: null, companyIdByName: null, existingCompanyAddress: null, salespersonId: 'user-dialog' })).toEqual({
      company: {
        create: {
          name: 'Northside Fitness',
          address: base.contactAddress,
          domainName: { primaryLinkUrl: 'https://northside.example' },
          accountOwnerId: 'user-dialog',
        },
      },
      person: null,
    });
  });

  it('names the contact after the email when the lead has no contact name', () => {
    const lead = { ...base, contactName: null, partnerName: null, emailFrom: { primaryEmail: 'Amy Wong <amy.wong@test.example.com>', additionalEmails: null } };

    expect(planCreateCustomer({ lead, chosenCompanyId: null, companyIdByName: null, existingCompanyAddress: null, salespersonId: null }).person).toMatchObject({
      create: { name: { firstName: 'Amy', lastName: 'Wong' }, emails: { primaryEmail: 'amy.wong@test.example.com' } },
    });
  });

  it('names the contact after the lead when nothing else names one', () => {
    const lead = { ...base, contactName: null, partnerName: null, emailFrom: { primaryEmail: 'ann@x.example', additionalEmails: null } };

    expect(planCreateCustomer({ lead, chosenCompanyId: null, companyIdByName: null, existingCompanyAddress: null, salespersonId: null })).toMatchObject({
      company: null,
      person: { create: { name: { firstName: 'Gym fit-out, 12', lastName: 'treadmills' } } },
    });
  });
});

describe('contactNameFromEmail', () => {
  it('takes the name part of an email text, or the whole text when it holds no address', () => {
    expect(contactNameFromEmail('"Raoul le Grand" <raoul@grosbedon.fr>')).toBe('Raoul le Grand');
    expect(contactNameFromEmail('Raoul <raoul@grosbedon.fr>')).toBe('Raoul');
    expect(contactNameFromEmail('raoul@grosbedon.fr')).toBeNull();
    expect(contactNameFromEmail('Raoul')).toBe('Raoul');
    expect(contactNameFromEmail(null)).toBeNull();
  });

  it('takes the name of the first address of a list', () => {
    expect(contactNameFromEmail('"Raoul le Grand" <raoul@grosbedon.fr>, other@example.com')).toBe('Raoul le Grand');
  });
});
