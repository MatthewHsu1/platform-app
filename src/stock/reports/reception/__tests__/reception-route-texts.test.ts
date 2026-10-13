import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { RECEPTION_MESSAGES } from 'src/stock/reports/reception/reception-messages.constant';
import { RECEPTION_ROUTE_TEXTS } from 'src/stock/reports/reception/reception-widget.front-component';
import { RECEPTION_MIXED_STATES_MESSAGE, RECEPTION_NO_TRANSFERS_MESSAGE } from 'src/stock/utils/reception-report-lines.util';

// The catalog the routes translate with: a text missing here reaches the user untranslated.
const CATALOG = JSON.parse(readFileSync('locales/en.json', 'utf8')) as Record<string, unknown>;
const ROUTE_TEXTS = [...Object.values(RECEPTION_MESSAGES), RECEPTION_NO_TRANSFERS_MESSAGE, RECEPTION_MIXED_STATES_MESSAGE];

describe('reception report route texts', () => {
  it('lists every text the routes answer, as the routes write it', () => {
    expect(RECEPTION_ROUTE_TEXTS.map((descriptor) => descriptor.message)).toEqual(ROUTE_TEXTS);
  });

  it('every text the routes answer is in the catalog', () => {
    expect(ROUTE_TEXTS.filter((text) => !(text in CATALOG))).toEqual([]);
  });
});
