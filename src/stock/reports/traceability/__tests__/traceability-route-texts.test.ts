import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { TRACEABILITY_MESSAGES } from 'src/stock/reports/traceability/traceability-messages.constant';
import { TRACEABILITY_ROUTE_TEXTS } from 'src/stock/reports/traceability/traceability-widget.front-component';

// The catalog the route translates with: a text missing here reaches the user untranslated.
const CATALOG = JSON.parse(readFileSync('locales/en.json', 'utf8')) as Record<string, unknown>;
const ROUTE_TEXTS = Object.values(TRACEABILITY_MESSAGES);

describe('traceability route texts', () => {
  it('lists every text the route answers, as the route writes it', () => {
    expect(TRACEABILITY_ROUTE_TEXTS.map((descriptor) => descriptor.message)).toEqual(ROUTE_TEXTS);
  });

  it('every text the route answers is in the catalog', () => {
    expect(ROUTE_TEXTS.filter((text) => !(text in CATALOG))).toEqual([]);
  });
});
