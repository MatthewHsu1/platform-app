import { type StockQuantityDay } from 'src/stock/utils/types/stock-quantity-day.type';

// The two facts under the forecast graph: the first day the level differs from
// the day before, and the level on the last day. Both are null for no days.
export const forecastGraphSummary = (graph: StockQuantityDay[]): { firstChangeDate: string | null; endingStock: number | null } => {
  const changed = graph.find((day, index) => index > 0 && day.forecast !== graph[index - 1].forecast);

  return { firstChangeDate: changed?.date ?? null, endingStock: graph.length === 0 ? null : graph[graph.length - 1].forecast };
};
