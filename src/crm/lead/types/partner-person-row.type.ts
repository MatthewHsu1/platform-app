import { type EmailsValue } from 'src/crm/lead/types/emails-value.type';
import { type PhonesValue } from 'src/crm/lead/types/phones-value.type';

export type PartnerPersonRow = {
  id: string;
  name: { firstName: string | null; lastName: string | null } | null;
  emails: EmailsValue | null;
  phones: PhonesValue | null;
  jobTitle: string | null;
  companyId: string | null;
};
