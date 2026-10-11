import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { PRODUCT_ROUTES_MESSAGES } from 'src/stock/reports/product-routes/product-routes-messages.constant';
import { PRODUCT_ROUTES_ROUTE_TEXTS } from 'src/stock/reports/product-routes/product-routes.front-component';

// The catalog the route translates with: a text missing here reaches the user untranslated.
const CATALOG = JSON.parse(readFileSync('locales/en.json', 'utf8')) as Record<string, unknown>;

describe('product routes route texts', () => {
  it('lists every text the route answers, as the route writes it', () => {
    expect(PRODUCT_ROUTES_ROUTE_TEXTS.map((descriptor) => descriptor.message)).toEqual(Object.values(PRODUCT_ROUTES_MESSAGES));
  });

  it('every text the route answers is in the catalog', () => {
    expect(Object.values(PRODUCT_ROUTES_MESSAGES).filter((text) => !(text in CATALOG))).toEqual([]);
  });
});
