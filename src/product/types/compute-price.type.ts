import { type COMPUTE_PRICE } from 'src/product/product-options.constant';

export type ComputePrice = (typeof COMPUTE_PRICE)[keyof typeof COMPUTE_PRICE];
