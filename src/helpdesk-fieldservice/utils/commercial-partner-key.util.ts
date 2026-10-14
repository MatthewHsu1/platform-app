// A contact counts as its company for the customer; a contact without one, and a company, count as themselves.
export const personCommercialKey = (person: { id: string; companyId: string | null }) =>
  person.companyId === null ? `person:${person.id}` : `company:${person.companyId}`;

export const companyCommercialKey = (companyId: string) => `company:${companyId}`;

// The customer a service location belongs to: its related company or contact, else its owner.
export const locationCommercialKey = (
  location: { partnerPersonId: string | null; partnerCompanyId: string | null; ownerPersonId: string | null; ownerCompanyId: string | null },
  personCompanies: ReadonlyMap<string, string | null>,
): string | null => {
  if (location.partnerCompanyId !== null) {
    return companyCommercialKey(location.partnerCompanyId);
  }
  if (location.partnerPersonId !== null) {
    return personCommercialKey({ id: location.partnerPersonId, companyId: personCompanies.get(location.partnerPersonId) ?? null });
  }
  if (location.ownerCompanyId !== null) {
    return companyCommercialKey(location.ownerCompanyId);
  }
  if (location.ownerPersonId !== null) {
    return personCommercialKey({ id: location.ownerPersonId, companyId: personCompanies.get(location.ownerPersonId) ?? null });
  }
  return null;
};
