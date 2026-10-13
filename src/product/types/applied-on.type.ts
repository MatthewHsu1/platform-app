import { type APPLIED_ON } from 'src/product/product-options.constant';

export type AppliedOn = (typeof APPLIED_ON)[keyof typeof APPLIED_ON];
