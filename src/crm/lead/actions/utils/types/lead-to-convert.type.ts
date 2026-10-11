import { type Phones } from 'src/crm/lead/actions/utils/types/phones.type';

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
