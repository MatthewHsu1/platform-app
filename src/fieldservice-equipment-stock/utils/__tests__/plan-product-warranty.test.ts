import { describe, expect, it } from 'vitest';

import { planProductWarranty } from 'src/fieldservice-equipment-stock/utils/plan-product-warranty.util';

describe('planProductWarranty', () => {
  it('takes the warranty length and unit of the product', () => {
    expect(
      planProductWarranty({ equipment: { productWarranty: 0, productWarrantyType: 'MONTH' }, product: { warranty: 2, warrantyType: 'YEAR' } }),
    ).toEqual({ productWarranty: 2, productWarrantyType: 'YEAR' });
  });

  it('writes only what differs', () => {
    expect(
      planProductWarranty({ equipment: { productWarranty: 12, productWarrantyType: 'MONTH' }, product: { warranty: 12, warrantyType: 'YEAR' } }),
    ).toEqual({ productWarrantyType: 'YEAR' });
    expect(
      planProductWarranty({ equipment: { productWarranty: 12, productWarrantyType: 'MONTH' }, product: { warranty: 12, warrantyType: 'MONTH' } }),
    ).toEqual({});
  });

  it('shows no length without a product', () => {
    expect(planProductWarranty({ equipment: { productWarranty: 12, productWarrantyType: 'YEAR' }, product: null })).toEqual({
      productWarranty: 0,
      productWarrantyType: 'MONTH',
    });
  });

  it('treats an empty equipment like one with no length', () => {
    expect(planProductWarranty({ equipment: { productWarranty: null, productWarrantyType: null }, product: null })).toEqual({});
  });
});
