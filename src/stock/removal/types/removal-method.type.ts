import { type REMOVAL_METHOD } from 'src/stock/routing-options.constant';

export type RemovalMethod = (typeof REMOVAL_METHOD)[keyof typeof REMOVAL_METHOD];
