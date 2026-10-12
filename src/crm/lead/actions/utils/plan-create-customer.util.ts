import { contactNameFromEmail } from 'src/crm/lead/actions/utils/contact-name-from-email.util';
import { type CustomerPlan } from 'src/crm/lead/actions/utils/types/customer-plan.type';
import { type PersonInput } from 'src/crm/lead/actions/utils/types/person-input.type';
import { type AddressValue } from 'src/crm/lead/types/address-value.type';
import { type LeadRow } from 'src/crm/lead/types/lead-row.type';
import { splitEmails } from 'src/crm/lead/utils/email.util';

const text = (value: string | null | undefined) => {
  const trimmed = value?.trim();

  return trimmed !== undefined && trimmed.length > 0 ? trimmed : null;
};

// One name field on the lead, first and last name in Twenty: the last word
// becomes the last name.
const splitName = (fullName: string) => {
  const lastSpace = fullName.lastIndexOf(' ');

  return lastSpace === -1
    ? { firstName: fullName, lastName: '' }
    : { firstName: fullName.slice(0, lastSpace), lastName: fullName.slice(lastSpace + 1) };
};

const filledAddress = (address: AddressValue | null) =>
  address !== null && Object.values(address).some((part) => part !== null && part !== '') ? address : null;

const personFromLead = (lead: LeadRow, name: string, address: AddressValue | null): PersonInput => {
  const [firstAddress] = splitEmails(lead.emailFrom?.primaryEmail ?? null);
  const jobTitle = text(lead.jobPosition);
  const phone = lead.phone;

  return {
    name: splitName(name),
    ...(firstAddress !== undefined && { emails: { primaryEmail: firstAddress.email } }),
    ...(phone !== null &&
      text(phone.primaryPhoneNumber) !== null && {
        phones: {
          primaryPhoneNumber: phone.primaryPhoneNumber,
          primaryPhoneCountryCode: phone.primaryPhoneCountryCode,
          primaryPhoneCallingCode: phone.primaryPhoneCallingCode,
        },
      }),
    ...(jobTitle !== null && { jobTitle }),
    ...(address !== null && { address }),
  };
};

// The customer made from a lead: a company from the company name (one with
// exactly that name is reused), a contact from the contact name inside it;
// with no contact name the company alone; with neither, a contact named after
// the lead. A contact inside a company that already exists takes that
// company's address; otherwise the lead's.
export const planCreateCustomer = ({
  lead,
  chosenCompanyId,
  companyIdByName,
  existingCompanyAddress,
  salespersonId,
}: {
  lead: LeadRow;
  chosenCompanyId: string | null;
  companyIdByName: string | null;
  existingCompanyAddress: AddressValue | null;
  salespersonId: string | null;
}): CustomerPlan => {
  const contactName = text(lead.contactName) ?? contactNameFromEmail(lead.emailFrom?.primaryEmail ?? null);
  const partnerName = text(lead.partnerName);
  const website = text(lead.website?.primaryLinkUrl);
  const address = filledAddress(lead.contactAddress);
  const accountOwnerId = salespersonId ?? lead.salespersonId;

  const newCompany = (name: string): CustomerPlan['company'] => ({
    create: {
      name,
      ...(address !== null && { address }),
      ...(website !== null && { domainName: { primaryLinkUrl: website } }),
      ...(accountOwnerId !== null && { accountOwnerId }),
    },
  });

  const company: CustomerPlan['company'] =
    chosenCompanyId !== null
      ? { id: chosenCompanyId }
      : partnerName !== null
        ? companyIdByName !== null
          ? { id: companyIdByName }
          : newCompany(partnerName)
        : lead.companyId !== null
          ? { id: lead.companyId }
          : null;

  const personAddress = company !== null && 'id' in company ? filledAddress(existingCompanyAddress) : address;

  if (contactName !== null) {
    return { company, person: { create: personFromLead(lead, contactName, personAddress) } };
  }

  if (company !== null) {
    return { company, person: null };
  }

  return { company: null, person: { create: personFromLead(lead, text(lead.name) ?? '', address) } };
};
