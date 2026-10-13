import { type PACKAGING_RESERVE_METHOD } from 'src/stock/stock-options.constant';

export type PackagingReserveMethod = (typeof PACKAGING_RESERVE_METHOD)[keyof typeof PACKAGING_RESERVE_METHOD];
