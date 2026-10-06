import { LEAD_TYPE, WON_STATUS } from 'src/crm/crm-options.constant';

type Phones = {
  primaryPhoneNumber: string | null;
  primaryPhoneCountryCode: string | null;
  primaryPhoneCallingCode: string | null;
};

export type LeadToConvert = {
  id: string;
  name: string | null;
  leadType: string | null;
  wonStatus: string | null;
  personId: string | null;
  companyId: string | null;
  contactName: string | null;
  partnerName: string | null;
  jobPosition: string | null;
  emailFrom: { primaryEmail: string | null } | null;
  phone: Phones | null;
  website: { primaryLinkUrl: string | null } | null;
  contactAddress: Record<string, string | null> | null;
};

export type CompanyInput = {
  name: string;
  address?: Record<string, string | null>;
  domainName?: { primaryLinkUrl: string };
};

export type PersonInput = {
  name: { firstName: string; lastName: string };
  emails?: { primaryEmail: string };
  phones?: Phones;
  jobTitle?: string;
};

export type LeadConversionPlan =
  | { kind: 'refuse'; reason: string }
  | {
      kind: 'convert';
      company: { id: string } | { create: CompanyInput } | null;
      // A new person joins the plan's company, once the handler knows its id.
      person: { id: string } | { create: PersonInput } | null;
      leadUpdate: { leadType: string; dateConversion: string };
    };

const text = (value: string | null | undefined) => {
  const trimmed = value?.trim();

  return trimmed !== undefined && trimmed.length > 0 ? trimmed : null;
};

// Twenty keeps first and last name apart; the reference keeps one name. The last word
// becomes the last name.
const splitName = (fullName: string) => {
  const lastSpace = fullName.lastIndexOf(' ');

  return lastSpace === -1
    ? { firstName: fullName, lastName: '' }
    : { firstName: fullName.slice(0, lastSpace), lastName: fullName.slice(lastSpace + 1) };
};

const personFromLead = (lead: LeadToConvert, name: string): PersonInput => {
  const email = text(lead.emailFrom?.primaryEmail);
  const jobTitle = text(lead.jobPosition);

  return {
    name: splitName(name),
    ...(email !== null && { emails: { primaryEmail: email } }),
    ...(text(lead.phone?.primaryPhoneNumber) !== null && { phones: lead.phone as Phones }),
    ...(jobTitle !== null && { jobTitle }),
  };
};

// The reference crm.lead convert_opportunity + _create_customer: a company from the
// company name, a contact from the contact name inside that company; with
// neither, a contact named after the lead.
export const planLeadConversion = ({
  lead,
  foundPersonId,
  foundCompanyId,
  now,
}: {
  lead: LeadToConvert;
  foundPersonId: string | null;
  foundCompanyId: string | null;
  now: string;
}): LeadConversionPlan => {
  if (lead.leadType === LEAD_TYPE.OPPORTUNITY) {
    return { kind: 'refuse', reason: 'This lead is already an opportunity.' };
  }

  if (lead.wonStatus === WON_STATUS.WON) {
    return { kind: 'refuse', reason: 'A won lead cannot be converted.' };
  }

  if (lead.wonStatus === WON_STATUS.LOST) {
    return { kind: 'refuse', reason: 'A lost lead cannot be converted. Restore it first.' };
  }

  const partnerName = text(lead.partnerName);
  const contactName = text(lead.contactName);
  const website = text(lead.website?.primaryLinkUrl);

  const company: Extract<LeadConversionPlan, { kind: 'convert' }>['company'] =
    lead.companyId !== null
      ? { id: lead.companyId }
      : foundCompanyId !== null
        ? { id: foundCompanyId }
        : partnerName !== null
          ? {
              create: {
                name: partnerName,
                ...(lead.contactAddress !== null && { address: lead.contactAddress }),
                ...(website !== null && { domainName: { primaryLinkUrl: website } }),
              },
            }
          : null;

  const fallbackName = company === null ? (text(lead.name) ?? 'Lead') : null;
  const newPersonName = contactName ?? fallbackName;

  const person: Extract<LeadConversionPlan, { kind: 'convert' }>['person'] =
    lead.personId !== null
      ? { id: lead.personId }
      : foundPersonId !== null
        ? { id: foundPersonId }
        : newPersonName !== null
          ? { create: personFromLead(lead, newPersonName) }
          : null;

  return {
    kind: 'convert',
    company,
    person,
    leadUpdate: { leadType: LEAD_TYPE.OPPORTUNITY, dateConversion: now },
  };
};
