import { describe, expect, it } from 'vitest';

import { planSupplierinfo } from 'src/product/utils/plan-supplierinfo.util';

const stored = { name: null, productUomId: null, productTmplId: null, productId: null };

describe('planSupplierinfo', () => {
  it('a vendor price with only a variant gets the product and the product unit', () => {
    expect(
      planSupplierinfo({
        stored: { ...stored, productId: 'v1' },
        templateIdOfProduct: 't1',
        templateUomId: 'units',
        vendorName: 'Acme',
        productName: 'Shirt (Red)',
      }),
    ).toEqual({ productTmplId: 't1', productUomId: 'units', name: 'Acme – Shirt (Red)' });
  });

  it('keeps a unit the user picked', () => {
    expect(
      planSupplierinfo({
        stored: { ...stored, productTmplId: 't1', productUomId: 'pack' },
        templateIdOfProduct: null,
        templateUomId: 'units',
        vendorName: 'Acme',
        productName: 'Shirt',
      }),
    ).toEqual({ name: 'Acme – Shirt' });
  });

  it('writes nothing when everything already matches', () => {
    expect(
      planSupplierinfo({
        stored: { name: 'Acme – Shirt', productUomId: 'units', productTmplId: 't1', productId: null },
        templateIdOfProduct: null,
        templateUomId: 'units',
        vendorName: 'Acme',
        productName: 'Shirt',
      }),
    ).toEqual({});
  });
});
