import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { BATCH_ROUTE_TEXTS } from 'src/stock-picking-batch/actions/put-in-pack.front-component';
import { BATCH_MESSAGES } from 'src/stock-picking-batch/stock-picking-batch-messages.constant';

// The catalog the routes and rules translate with: a text missing here reaches the user untranslated.
const CATALOG = JSON.parse(readFileSync('locales/en.json', 'utf8')) as Record<string, unknown>;

describe('batch route texts', () => {
  it('every text the batch routes and rules answer is in the catalog', () => {
    expect(Object.values(BATCH_MESSAGES).filter((text) => !(text in CATALOG))).toEqual([]);
  });

  it('every text listed for the extractor is in the catalog', () => {
    const listed = BATCH_ROUTE_TEXTS.map((descriptor) => descriptor.message);

    expect(listed.filter((text) => text === undefined || !(text in CATALOG))).toEqual([]);
  });
});
