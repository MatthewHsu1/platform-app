type Country = { address: { addressCountry: string | null } | null };

export type TransferForGroups = {
  locationId: string | null;
  location: { completeName: string | null } | null;
  locationDestId: string | null;
  locationDest: { completeName: string | null } | null;
  person: {
    id: string;
    name: { firstName: string | null; lastName: string | null } | null;
    company: Country | null;
  } & Partial<Country> | null;
  company: ({ id: string; name: string | null } & Country) | null;
};
