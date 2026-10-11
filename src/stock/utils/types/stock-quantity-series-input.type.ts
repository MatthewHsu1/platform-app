import { type StockQuantitySeriesMove } from 'src/stock/utils/types/stock-quantity-series-move.type';
import { type StockQuantitySeriesQuant } from 'src/stock/utils/types/stock-quantity-series-quant.type';

// warehouseOfLocation maps each location the moves and quants name to the
// warehouse it sits in, or null. from/to narrow the returned days inside the
// window of `months` months around today.
export type StockQuantitySeriesInput = {
  warehouseId: string;
  moves: StockQuantitySeriesMove[];
  quants: StockQuantitySeriesQuant[];
  warehouseOfLocation: Map<string, string | null>;
  usageOfLocation: Map<string, string>;
  today: string;
  months?: number;
  from?: string;
  to?: string;
};
