import { type SCRAP_STATE } from 'src/stock/stock-options.constant';

export type ScrapState = (typeof SCRAP_STATE)[keyof typeof SCRAP_STATE];
