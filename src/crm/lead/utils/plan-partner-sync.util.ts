import { readAddressValue, readEmailsValue, readLinksValue, readPhonesValue } from 'src/crm/lead/lead-selection';
import { type LeadRow } from 'src/crm/lead/types/lead-row.type';
import { type PartnerCompanyRow } from 'src/crm/lead/types/partner-company-row.type';
import { type PartnerPersonRow } from 'src/crm/lead/types/partner-person-row.type';
import { type PersonPush } from 'src/crm/lead/types/person-push.type';
import { type PhonesValue } from 'src/crm/lead/types/phones-value.type';
import { normaliseEmail } from 'src/crm/lead/utils/email.util';
import { normalisePhone } from 'src/crm/lead/utils/phone.util';
import { sameValue } from 'src/shared/utils/same-value.util';

const ADDRESS_PARTS = ['addressStreet1', 'addressStreet2', 'addressCity', 'addressPostcode', 'addressState', 'addressCountry'] as const;

const filled = (value: string | null | undefined): value is string => value !== null && value !== undefined && value.trim() !== '';

// Compared after normalising; a value that does not normalise is compared as typed.
const emailKey = (email: string | null | undefined) => (filled(email) ? (normaliseEmail(email) ?? email.trim()) : null);
const phoneKey = (phone: PhonesValue | null | undefined) =>
  phone !== null && phone !== undefined && filled(phone.primaryPhoneNumber)
    ? (normalisePhone(phone) ?? `${phone.primaryPhoneCallingCode ?? ''}${phone.primaryPhoneNumber}`)
    : null;

const personName = (person: PartnerPersonRow) => {
  const text = [person.name?.firstName, person.name?.lastName].filter(filled).map((part) => part.trim()).join(' ');

  return text === '' ? null : text;
};

const emailFromPerson = (lead: LeadRow, person: PartnerPersonRow): Partial<LeadRow> => {
  const personEmail = person.emails?.primaryEmail ?? null;

  if (!filled(personEmail) || emailKey(personEmail) === emailKey(lead.emailFrom?.primaryEmail)) {
    return {};
  }

  return { emailFrom: readEmailsValue({ primaryEmail: personEmail, additionalEmails: lead.emailFrom?.additionalEmails ?? null }) };
};

const phoneFromPerson = (lead: LeadRow, person: PartnerPersonRow): Partial<LeadRow> => {
  const phones = person.phones;

  if (phones === null || !filled(phones.primaryPhoneNumber) || phoneKey(phones) === phoneKey(lead.phone)) {
    return {};
  }

  return {
    phone: readPhonesValue({
      primaryPhoneNumber: phones.primaryPhoneNumber,
      primaryPhoneCountryCode: phones.primaryPhoneCountryCode,
      primaryPhoneCallingCode: phones.primaryPhoneCallingCode,
      additionalPhones: lead.phone?.additionalPhones ?? null,
    }),
  };
};

// A contact edit reaches its leads through email and phone only, each when
// that part of the contact changed; the other contact fields follow a change
// of the lead's links.
export const planPersonContactSync = ({
  lead,
  person,
  changed = { email: true, phone: true },
}: {
  lead: LeadRow;
  person: PartnerPersonRow;
  changed?: { email: boolean; phone: boolean };
}): Partial<LeadRow> => ({
  ...(changed.email ? emailFromPerson(lead, person) : {}),
  ...(changed.phone ? phoneFromPerson(lead, person) : {}),
});

// The lead's partner is its contact, or without one its customer company.
// The partner fills the lead's contact fields when it changes; the customer
// company fills the company name, website and address when either link
// changes. Fields the save wrote itself keep the typed value.
export const planPartnerSync = ({
  lead,
  person,
  company,
  personCompany,
  changed,
  protectedFields,
}: {
  lead: LeadRow;
  person: PartnerPersonRow | null;
  company: PartnerCompanyRow | null;
  personCompany: PartnerCompanyRow | null;
  changed: { person: boolean; company: boolean };
  protectedFields: ReadonlySet<string>;
}): Partial<LeadRow> => {
  const partnerChanged = changed.person || (person === null && changed.company);

  if (!partnerChanged && !changed.company) {
    return {};
  }

  const values: Partial<LeadRow> = {};
  const hasPartner = person !== null || company !== null;

  if (!hasPartner) {
    values.contactName = null;
    values.partnerName = null;
  } else {
    if (partnerChanged && person !== null && personName(person) !== null) {
      values.contactName = personName(person);
    }

    const companyName = filled(company?.name) ? company.name : filled(personCompany?.name) ? personCompany.name : null;

    if (companyName !== null) {
      values.partnerName = companyName;
    }
  }

  if (partnerChanged && person !== null) {
    if (!filled(lead.jobPosition) || filled(person.jobTitle)) {
      values.jobPosition = person.jobTitle;
    }
    Object.assign(values, planPersonContactSync({ lead, person }));
  }

  if (company !== null) {
    const companyUrl = company.domainName?.primaryLinkUrl ?? null;

    if (!filled(lead.website?.primaryLinkUrl) || filled(companyUrl)) {
      values.website = readLinksValue({
        primaryLinkUrl: companyUrl,
        primaryLinkLabel: company.domainName?.primaryLinkLabel ?? null,
        secondaryLinks: lead.website?.secondaryLinks ?? null,
      });
    }

    // All six parts or none, so a lead never mixes two addresses.
    if (ADDRESS_PARTS.some((part) => filled(company.address?.[part]))) {
      values.contactAddress = readAddressValue(Object.fromEntries(ADDRESS_PARTS.map((part) => [part, company.address?.[part] ?? null])));
    }
  }

  return Object.fromEntries(
    Object.entries(values).filter(([key, value]) => !protectedFields.has(key) && !sameValue(value, lead[key as keyof LeadRow])),
  ) as Partial<LeadRow>;
};

// What a save sends to the lead's contact: only a value it wrote, only when
// not empty, only when it differs after normalising.
export const planPersonPush = ({
  lead,
  person,
  written,
}: {
  lead: LeadRow;
  person: PartnerPersonRow | null;
  written: ReadonlySet<string>;
}): PersonPush | null => {
  if (person === null || lead.personId === null) {
    return null;
  }

  const push: PersonPush = { personId: person.id };
  const leadEmail = lead.emailFrom?.primaryEmail ?? null;

  if (written.has('emailFrom') && filled(leadEmail) && emailKey(leadEmail) !== emailKey(person.emails?.primaryEmail)) {
    push.primaryEmail = leadEmail;
  }

  if (written.has('phone') && lead.phone !== null && filled(lead.phone.primaryPhoneNumber) && phoneKey(lead.phone) !== phoneKey(person.phones)) {
    push.phone = {
      primaryPhoneNumber: lead.phone.primaryPhoneNumber,
      primaryPhoneCountryCode: lead.phone.primaryPhoneCountryCode,
      primaryPhoneCallingCode: lead.phone.primaryPhoneCallingCode,
      additionalPhones: person.phones?.additionalPhones ?? [],
    };
  }

  return push.primaryEmail === undefined && push.phone === undefined ? null : push;
};
