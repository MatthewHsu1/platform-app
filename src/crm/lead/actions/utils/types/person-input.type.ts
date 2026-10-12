import { type AddressValue } from 'src/crm/lead/types/address-value.type';

export type PersonInput = {
  name: { firstName: string; lastName: string };
  emails?: { primaryEmail: string };
  phones?: { primaryPhoneNumber: string | null; primaryPhoneCountryCode: string | null; primaryPhoneCallingCode: string | null };
  jobTitle?: string;
  postalAddress?: AddressValue;
};
