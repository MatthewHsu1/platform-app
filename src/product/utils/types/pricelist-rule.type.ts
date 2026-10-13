import { type AppliedOn } from 'src/product/types/applied-on.type';
import { type PricelistBase } from 'src/product/types/pricelist-base.type';
import { type ComputePrice } from 'src/product/types/compute-price.type';

export type PricelistRule = {
  id: string;
  createdAt: string;
  appliedOn: AppliedOn;
  categPath: string | null;
  categCompleteName: string | null;
  productTmplId: string | null;
  productId: string | null;
  minQuantity: number;
  dateStart: string | null;
  dateEnd: string | null;
  base: PricelistBase;
  basePricelistId: string | null;
  computePrice: ComputePrice;
  fixedPrice: number;
  percentPrice: number;
  priceDiscount: number;
  priceMarkup: number;
  priceRound: number;
  priceSurcharge: number;
  priceMinMargin: number;
  priceMaxMargin: number;
};
