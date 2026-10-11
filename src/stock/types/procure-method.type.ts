import { type PROCURE_METHOD } from 'src/stock/stock-options.constant';

export type ProcureMethod = (typeof PROCURE_METHOD)[keyof typeof PROCURE_METHOD];
