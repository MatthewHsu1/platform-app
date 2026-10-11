import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { CLAIM_HELD_MESSAGE } from 'src/shared/claims/claim';
import { ORDERPOINT_ROUTE_TEXTS, SHARED_ROUTE_TEXTS } from 'src/stock/orderpoint/actions/replenishment-info.front-component';
import { ORDERPOINT_MESSAGES } from 'src/stock/orderpoint/orderpoint-messages.constant';
import {
  LOOP_MESSAGE,
  NO_PRODUCT_MESSAGE,
  NO_RULE_MESSAGE,
  NO_SOURCE_MESSAGE,
} from 'src/stock/utils/procurement/plan-procurements.util';

// The catalog the routes translate with: a text missing here reaches the user untranslated.
const CATALOG = JSON.parse(readFileSync('locales/en.json', 'utf8')) as Record<string, unknown>;

describe('reordering rule route texts', () => {
  it('every text the routes answer is in the catalog', () => {
    expect(Object.values(ORDERPOINT_MESSAGES).filter((text) => !(text in CATALOG))).toEqual([]);
  });

  it('every text listed for the extractor is in the catalog', () => {
    const listed = ORDERPOINT_ROUTE_TEXTS.map((descriptor) => descriptor.message);

    expect(listed.filter((text) => text === undefined || !(text in CATALOG))).toEqual([]);
  });

  it('the held-record and supply-chain texts are listed as their sources write them, and are in the catalog', () => {
    const sources = [CLAIM_HELD_MESSAGE, NO_RULE_MESSAGE, LOOP_MESSAGE, NO_SOURCE_MESSAGE, NO_PRODUCT_MESSAGE];

    expect(SHARED_ROUTE_TEXTS.map((descriptor) => descriptor.message)).toEqual(sources);
    expect(sources.filter((text) => !(text in CATALOG))).toEqual([]);
  });
});
