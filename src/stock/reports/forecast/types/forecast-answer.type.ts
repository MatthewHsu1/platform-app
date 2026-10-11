import { type ForecastHeading } from 'src/stock/reports/forecast/types/forecast-heading.type';
import { type ForecastProduct } from 'src/stock/reports/forecast/types/forecast-product.type';
import { type ForecastLine } from 'src/stock/utils/types/forecast-line.type';
import { type StockQuantityDay } from 'src/stock/utils/types/stock-quantity-day.type';

// today is the UTC date the report was computed for; truncated is set when a
// move chain was too long to read in full.
export type ForecastAnswer = {
  warehouse: { id: string; name: string };
  headings: ForecastHeading[];
  products: ForecastProduct[];
  lines: ForecastLine[];
  graph: StockQuantityDay[];
  leadHorizonDate: string | null;
  today: string;
  digits: number;
  useExpirationDate: boolean;
  truncated: boolean;
};
