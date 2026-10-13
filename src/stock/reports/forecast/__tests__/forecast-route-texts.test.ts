import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { FORECAST_MESSAGES } from 'src/stock/reports/forecast/forecast-messages.constant';
import { FORECAST_ROUTE_TEXTS } from 'src/stock/reports/forecast/forecast-widget.front-component';
import { DELAY_ON_RULE_MESSAGE, LEAD_DAYS_VALUE_MESSAGE, TIME_HORIZON_MESSAGE } from 'src/stock/utils/procurement/lead-days.util';

// The catalog the routes and the view translate with: a text missing here reaches the user untranslated.
const CATALOG = JSON.parse(readFileSync('locales/en.json', 'utf8')) as Record<string, unknown>;
const ROUTE_TEXTS = Object.values(FORECAST_MESSAGES);

describe('forecast route texts', () => {
  it('lists every text the routes answer, as the routes write them', () => {
    expect(FORECAST_ROUTE_TEXTS.map((descriptor) => descriptor.message)).toEqual(ROUTE_TEXTS);
  });

  it('every text the routes answer, and every lead time text the view shows, is in the catalog', () => {
    const texts = [...ROUTE_TEXTS, DELAY_ON_RULE_MESSAGE, TIME_HORIZON_MESSAGE, LEAD_DAYS_VALUE_MESSAGE];

    expect(texts.filter((text) => !(text in CATALOG))).toEqual([]);
  });
});
