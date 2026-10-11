import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { INVENTORY_AT_DATE_ROUTE_TEXTS } from 'src/stock/reports/inventory-at-date/inventory-at-date.front-component';
import { INVENTORY_AT_DATE_MESSAGES } from 'src/stock/reports/inventory-at-date/inventory-at-date-messages.constant';

// The catalog the route translates with: a text missing here reaches the user untranslated.
const CATALOG = JSON.parse(readFileSync('locales/en.json', 'utf8')) as Record<string, unknown>;

describe('inventory at date route texts', () => {
  it('lists every text the route answers, as the route writes it', () => {
    expect(INVENTORY_AT_DATE_ROUTE_TEXTS.map((descriptor) => descriptor.message)).toEqual(
      Object.values(INVENTORY_AT_DATE_MESSAGES),
    );
  });

  it('every text the route answers is in the catalog', () => {
    expect(Object.values(INVENTORY_AT_DATE_MESSAGES).filter((text) => !(text in CATALOG))).toEqual([]);
  });
});
