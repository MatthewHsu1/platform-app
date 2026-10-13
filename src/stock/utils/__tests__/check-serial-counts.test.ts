import { describe, expect, it } from 'vitest';

import { translate } from 'src/shared/i18n/translate';
import { checkSerialCounts } from 'src/stock/utils/check-serial-counts.util';
import { type LocationUsage } from 'src/stock/types/location-usage.type';
import { type SerialCheckInput } from 'src/stock/utils/types/serial-check-input.type';
import { type SerialCheckLine } from 'src/stock/utils/types/serial-check-line.type';

const receipt = (fields: Partial<SerialCheckLine>): SerialCheckLine => ({
  id: 'l1',
  productId: 'p',
  productName: 'Tracked by SN',
  tracking: 'SERIAL',
  quantityProductUom: 1,
  lotId: null,
  locationId: 'vendors',
  locationDestId: 'stock',
  moveLocationDestId: 'stock',
  ...fields,
});

const location = (parentPath: string, usage: LocationUsage) => ({ parentPath, usage });

const LOCATIONS = new Map([
  ['vendors', location('partners/vendors/', 'SUPPLIER')],
  ['customers', location('partners/customers/', 'CUSTOMER')],
  ['stock', location('wh/stock/', 'INTERNAL')],
  ['shelf', location('wh/stock/shelf/', 'INTERNAL')],
  ['scrap', location('virtual/scrap/', 'INVENTORY')],
]);

const check = (input: Partial<SerialCheckInput>) => {
  const refusal = checkSerialCounts({
    lines: [],
    lotPlan: { assign: [], create: [] },
    lotNameById: new Map([['sn1', 'SN1']]),
    quants: [],
    locations: LOCATIONS,
    digits: 2,
    ...input,
  });

  return refusal === null ? null : translate(null, refusal.message, refusal.values);
};

const ASSIGNED = 'The serial number has already been assigned: \n Product: Tracked by SN, Serial Number: SN1';

describe('checkSerialCounts', () => {
  it('refuses receiving a serial number already in stock', () => {
    expect(
      check({
        lines: [receipt({ lotId: 'sn1' })],
        quants: [{ productId: 'p', lotId: 'sn1', locationId: 'stock', quantity: 1 }],
      }),
    ).toBe(ASSIGNED);
  });

  it('refuses a typed name that finds a serial number already in stock', () => {
    expect(
      check({
        lines: [receipt({})],
        lotPlan: { assign: [{ lineId: 'l1', lotId: 'sn1' }], create: [] },
        quants: [{ productId: 'p', lotId: 'sn1', locationId: 'stock', quantity: 1 }],
      }),
    ).toBe(ASSIGNED);
  });

  it('refuses a serial number arriving in a location under the destination that already holds it', () => {
    expect(
      check({
        lines: [receipt({ lotId: 'sn1', locationDestId: 'shelf' })],
        quants: [{ productId: 'p', lotId: 'sn1', locationId: 'shelf', quantity: 1 }],
      }),
    ).toBe(ASSIGNED);
  });

  it('counts only the locations the stock arrives in: a serial received again from the vendor while at a customer passes', () => {
    expect(
      check({
        lines: [receipt({ lotId: 'sn1' })],
        quants: [
          { productId: 'p', lotId: 'sn1', locationId: 'vendors', quantity: -1 },
          { productId: 'p', lotId: 'sn1', locationId: 'customers', quantity: 1 },
        ],
      }),
    ).toBeNull();
  });

  it('lets a serial in stock be delivered, and new serials be received', () => {
    expect(
      check({
        lines: [
          receipt({ id: 'out', lotId: 'sn1', locationId: 'stock', locationDestId: 'customers', moveLocationDestId: 'customers' }),
          receipt({ id: 'in2' }),
          receipt({ id: 'in3' }),
        ],
        lotPlan: {
          assign: [],
          create: [
            { productId: 'p', name: 'SN2', expirationDate: null, lineIds: ['in2'] },
            { productId: 'p', name: 'SN3', expirationDate: null, lineIds: ['in3'] },
          ],
        },
        quants: [
          { productId: 'p', lotId: 'sn1', locationId: 'stock', quantity: 1 },
          { productId: 'p', lotId: 'sn1', locationId: 'vendors', quantity: -1 },
        ],
      }),
    ).toBeNull();
  });

  it('refuses the same new serial name twice in one validation', () => {
    expect(
      check({
        lines: [receipt({ id: 'a' }), receipt({ id: 'b' })],
        lotPlan: {
          assign: [],
          create: [
            { productId: 'p', name: 'SN9', expirationDate: null, lineIds: ['a'] },
            { productId: 'p', name: 'SN9', expirationDate: null, lineIds: ['b'] },
          ],
        },
      }),
    ).toBe(
      'The combination of lot/serial number and product must be unique within a company including when no company is defined.\nThe following combinations contain duplicates:\n - Product: Tracked by SN, Lot/Serial Number: SN9',
    );
  });

  it('does not count a serial piling up in a scrap location', () => {
    expect(
      check({
        lines: [receipt({ lotId: 'sn1', locationId: 'stock', locationDestId: 'scrap', moveLocationDestId: 'scrap' })],
        quants: [
          { productId: 'p', lotId: 'sn1', locationId: 'stock', quantity: 1 },
          { productId: 'p', lotId: 'sn1', locationId: 'scrap', quantity: 1 },
        ],
      }),
    ).toBeNull();
  });

  it('ignores lot-tracked products', () => {
    expect(
      check({
        lines: [receipt({ tracking: 'LOT', lotId: 'sn1', quantityProductUom: 5 })],
        quants: [{ productId: 'p', lotId: 'sn1', locationId: 'stock', quantity: 5 }],
      }),
    ).toBeNull();
  });
});
