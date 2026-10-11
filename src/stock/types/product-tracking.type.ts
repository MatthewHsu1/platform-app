import { type PRODUCT_TRACKING } from 'src/stock/stock-options.constant';

export type ProductTracking = (typeof PRODUCT_TRACKING)[keyof typeof PRODUCT_TRACKING];
