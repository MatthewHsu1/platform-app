import { describe, expect, it } from 'vitest';

import { procurementOfRequest } from 'src/stock/utils/procurement/procurement-of-request.util';

const request = (values: Record<string, unknown>) => ({
  productId: 'product',
  productQty: 2,
  productUomId: 'unit',
  locationId: 'customers',
  name: 'Desk',
  origin: 'SO1',
  values,
});

describe('procurementOfRequest', () => {
  it('searches rules of no warehouse in particular for an exchange whose operation type has none', () => {
    expect(procurementOfRequest(request({ warehouse: null, references: ['ref-1'] }), new Map()).values).toMatchObject({
      warehouseId: null,
      referenceIds: ['ref-1'],
    });
  });

  it('lets the location chain give the warehouses when the request names none', () => {
    expect('warehouseId' in procurementOfRequest(request({}), new Map()).values).toBe(false);
  });

  it('reads the partner as a company or a person', () => {
    const partners = new Map([['acme', { companyId: 'acme', personId: null }]]);

    expect(procurementOfRequest(request({ partner: 'acme', warehouse: 'WH' }), partners).values).toMatchObject({
      warehouseId: 'WH',
      partner: { companyId: 'acme', personId: null },
    });
  });
});
