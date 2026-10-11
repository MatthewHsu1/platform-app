import { type CREATE_BACKORDER } from 'src/stock/stock-options.constant';

export type CreateBackorder = (typeof CREATE_BACKORDER)[keyof typeof CREATE_BACKORDER];
