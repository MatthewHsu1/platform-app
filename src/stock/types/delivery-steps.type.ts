import { type DELIVERY_STEPS } from 'src/stock/stock-options.constant';

export type DeliverySteps = (typeof DELIVERY_STEPS)[keyof typeof DELIVERY_STEPS];
