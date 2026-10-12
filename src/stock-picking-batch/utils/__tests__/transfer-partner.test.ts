import { describe, expect, it } from 'vitest';

import { type TransferForGroups } from 'src/stock-picking-batch/types/transfer-for-groups.type';
import { transferGroupValues } from 'src/stock-picking-batch/utils/transfer-partner.util';

const transfer = (values: Partial<TransferForGroups> = {}): TransferForGroups => ({
  locationId: 'stock',
  location: { completeName: 'WH/Stock' },
  locationDestId: 'customers',
  locationDest: { completeName: 'Partners/Customers' },
  person: null,
  company: null,
  ...values,
});
const acme = { id: 'acme', name: 'Acme', address: { addressCountry: 'Belgium' } };

describe('transferGroupValues', () => {
  it('takes the contact person over the contact company', () => {
    expect(
      transferGroupValues(
        transfer({
          person: { id: 'ann', name: { firstName: 'Ann', lastName: 'Lee' }, company: { address: { addressCountry: 'France' } } },
          company: acme,
        }),
      ),
    ).toMatchObject({ partnerKey: 'ann', partnerName: 'Ann Lee', countryKey: 'France', countryName: 'France' });
  });

  it("takes the contact person's own country before their company's", () => {
    expect(
      transferGroupValues(
        transfer({
          person: {
            id: 'ann',
            name: { firstName: 'Ann', lastName: 'Lee' },
            address: { addressCountry: 'Spain' },
            company: { address: { addressCountry: 'France' } },
          },
          company: acme,
        }),
      ),
    ).toMatchObject({ partnerKey: 'ann', countryKey: 'Spain', countryName: 'Spain' });
  });

  it("takes the person's company country when the person's own country is empty", () => {
    expect(
      transferGroupValues(
        transfer({
          person: { id: 'ann', name: null, address: { addressCountry: '' }, company: { address: { addressCountry: 'France' } } },
        }),
      ),
    ).toMatchObject({ countryKey: 'France' });
  });

  it('takes the contact company when the transfer has no person', () => {
    expect(transferGroupValues(transfer({ company: acme }))).toMatchObject({
      partnerKey: 'acme',
      partnerName: 'Acme',
      countryKey: 'Belgium',
      countryName: 'Belgium',
    });
  });

  it('has no contact and no country when the transfer has neither', () => {
    expect(transferGroupValues(transfer())).toEqual({
      partnerKey: null,
      partnerName: null,
      countryKey: null,
      countryName: null,
      locationId: 'stock',
      locationName: 'WH/Stock',
      locationDestId: 'customers',
      locationDestName: 'Partners/Customers',
    });
  });

  it('reads an empty country as no country', () => {
    expect(transferGroupValues(transfer({ company: { ...acme, address: { addressCountry: '' } } }))).toMatchObject({
      countryKey: null,
      countryName: null,
    });
  });
});
