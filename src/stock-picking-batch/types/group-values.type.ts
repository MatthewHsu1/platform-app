// What auto batching groups transfers by: the contact, its country and the
// two locations, with the texts a batch description is made of.
export type GroupValues = {
  partnerKey: string | null;
  partnerName: string | null;
  countryKey: string | null;
  countryName: string | null;
  locationId: string | null;
  locationName: string;
  locationDestId: string | null;
  locationDestName: string;
};
