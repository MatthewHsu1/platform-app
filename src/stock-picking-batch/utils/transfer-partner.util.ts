import { type GroupValues } from 'src/stock-picking-batch/types/group-values.type';
import { type TransferForGroups } from 'src/stock-picking-batch/types/transfer-for-groups.type';

// The contact of a transfer or a move. Twenty returns a nested to-one relation
// as null unless its deletedAt is selected.
export const CONTACT_GROUP_SELECTION =
  'person { id name { firstName lastName } deletedAt company { id address { addressCountry } deletedAt } } company { id name address { addressCountry } deletedAt }';

export const TRANSFER_GROUP_SELECTION = `locationId location { completeName deletedAt } locationDestId locationDest { completeName deletedAt } ${CONTACT_GROUP_SELECTION}`;

const textOrNull = (value: string | null | undefined) => (value === undefined || value === null || value === '' ? null : value);

// The contact is the person when set, else the company. A person's country is
// their company's: Twenty people have no address.
export const contactGroupValues = ({ person, company }: Pick<TransferForGroups, 'person' | 'company'>) => {
  const personName = person === null ? null : [person.name?.firstName, person.name?.lastName].filter(Boolean).join(' ');
  const country = textOrNull(person !== null ? person.company?.address?.addressCountry : company?.address?.addressCountry);

  return {
    partnerKey: person?.id ?? company?.id ?? null,
    partnerName: person !== null ? personName : (company?.name ?? null),
    countryKey: country,
    countryName: country,
  };
};

export const transferGroupValues = (transfer: TransferForGroups): GroupValues => ({
  ...contactGroupValues(transfer),
  locationId: transfer.locationId,
  locationName: transfer.location?.completeName ?? '',
  locationDestId: transfer.locationDestId,
  locationDestName: transfer.locationDest?.completeName ?? '',
});
