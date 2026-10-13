import { type AppliedOn } from 'src/product/types/applied-on.type';
import { type PricelistBase } from 'src/product/types/pricelist-base.type';
import { type ComputePrice } from 'src/product/types/compute-price.type';

export type PricelistItemValues = {
  appliedOn: AppliedOn;
  categId: string | null;
  productTmplId: string | null;
  productId: string | null;
  base: PricelistBase;
  basePricelistId: string | null;
  computePrice: ComputePrice;
  priceDiscount: number;
  priceMarkup: number;
};
