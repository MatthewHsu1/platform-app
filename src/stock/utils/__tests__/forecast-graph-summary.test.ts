import { describe, expect, it } from 'vitest';

import { forecastGraphSummary } from 'src/stock/utils/forecast-graph-summary.util';

const day = (date: string, forecast: number) => ({ date, forecast, incoming: 0, outgoing: 0 });

describe('forecastGraphSummary', () => {
  it('names the day the level first moves and the level at the end', () => {
    const graph = [day('2026-10-09', 0), day('2026-10-10', 0), day('2026-10-11', 1), day('2026-10-12', 1)];

    expect(forecastGraphSummary(graph)).toEqual({ firstChangeDate: '2026-10-11', endingStock: 1 });
  });

  it('has no change day when the level never moves', () => {
    expect(forecastGraphSummary([day('2026-10-09', 3), day('2026-10-10', 3)])).toEqual({ firstChangeDate: null, endingStock: 3 });
  });

  it('reports the first change when the level later falls', () => {
    const graph = [day('2026-10-09', 2), day('2026-10-10', 1), day('2026-10-11', -1)];

    expect(forecastGraphSummary(graph)).toEqual({ firstChangeDate: '2026-10-10', endingStock: -1 });
  });

  it('has nothing to report for no days', () => {
    expect(forecastGraphSummary([])).toEqual({ firstChangeDate: null, endingStock: null });
  });
});
