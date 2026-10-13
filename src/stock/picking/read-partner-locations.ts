import { records } from 'src/shared/triggers/records';
import { type PartnerLocations } from 'src/stock/types/partner-locations.type';

const companies = records('company', 'companies');
const people = records('person', 'people');
const SELECTION = 'id propertyStockCustomerId propertyStockSupplierId';

// "The partner" of a transfer is its person when set, else its company.
export const readPartnerLocations = async ({
  companyId,
  personId,
}: {
  companyId: string | null;
  personId: string | null;
}): Promise<PartnerLocations | null> => {
  const [partner] =
    personId !== null
      ? await people.find<PartnerLocations>({ id: { eq: personId } }, SELECTION)
      : companyId !== null
        ? await companies.find<PartnerLocations>({ id: { eq: companyId } }, SELECTION)
        : [];

  return partner ?? null;
};
