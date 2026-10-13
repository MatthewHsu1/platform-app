import { type RECEPTION_STEPS } from 'src/stock/stock-options.constant';

export type ReceptionSteps = (typeof RECEPTION_STEPS)[keyof typeof RECEPTION_STEPS];
