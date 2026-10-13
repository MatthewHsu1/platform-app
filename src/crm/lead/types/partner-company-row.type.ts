import { type AddressValue } from 'src/crm/lead/types/address-value.type';
import { type LinksValue } from 'src/crm/lead/types/links-value.type';

export type PartnerCompanyRow = {
  id: string;
  name: string | null;
  domainName: LinksValue | null;
  address: AddressValue | null;
};
