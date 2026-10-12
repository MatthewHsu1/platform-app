import { type AddressValue } from 'src/crm/lead/types/address-value.type';

export type CompanyInput = {
  name: string;
  address?: AddressValue;
  domainName?: { primaryLinkUrl: string };
  accountOwnerId?: string;
};
