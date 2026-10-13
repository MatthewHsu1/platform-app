import { type PRICELIST_BASE } from 'src/product/product-options.constant';

export type PricelistBase = (typeof PRICELIST_BASE)[keyof typeof PRICELIST_BASE];
