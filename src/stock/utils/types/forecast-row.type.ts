import { type ForecastLine } from 'src/stock/utils/types/forecast-line.type';

// How a forecast line is shown: what its stock column says, and the button it
// offers (with the quantity Reserve can take from stock on hand, when shown).
export type ForecastRow = {
  line: ForecastLine;
  available: 'receipt' | 'stockInTransit' | 'freeStockInTransit' | 'stockToReserve' | 'expired' | 'freeStock' | 'notAvailable';
  action: { kind: 'reserve'; quantity: number | null } | { kind: 'unreserve' } | null;
  startsProduct: boolean;
};
