import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { OVERVIEW_ROUTE_TEXTS } from 'src/stock/overview/overview.front-component';
import { OVERVIEW_MESSAGES } from 'src/stock/overview/overview-messages.constant';

// The catalog the routes translate with: a text missing here reaches the user untranslated.
const CATALOG = JSON.parse(readFileSync('locales/en.json', 'utf8')) as Record<string, unknown>;

describe('overview route texts', () => {
  it('lists every text the routes answer, as the routes write it', () => {
    expect(OVERVIEW_ROUTE_TEXTS.map((descriptor) => descriptor.message)).toEqual(Object.values(OVERVIEW_MESSAGES));
  });

  it('every text the routes answer is in the catalog', () => {
    expect(Object.values(OVERVIEW_MESSAGES).filter((text) => !(text in CATALOG))).toEqual([]);
  });
});
