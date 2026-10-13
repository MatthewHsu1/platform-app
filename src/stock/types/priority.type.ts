import { type PRIORITY } from 'src/stock/stock-options.constant';

export type Priority = (typeof PRIORITY)[keyof typeof PRIORITY];
