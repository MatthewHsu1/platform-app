import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { MOVE_SPLIT_MESSAGES } from 'src/stock/move/move-split-messages.constant';
import { MOVE_SPLIT_ROUTE_TEXTS } from 'src/stock/picking/actions/split-picking.front-component';

// The catalog the routes translate with: a text missing here reaches the user untranslated.
const CATALOG = JSON.parse(readFileSync('locales/en.json', 'utf8')) as Record<string, unknown>;

describe('move split texts', () => {
  it('every text a move split answers is in the catalog', () => {
    expect(Object.values(MOVE_SPLIT_MESSAGES).filter((text) => !(text in CATALOG))).toEqual([]);
  });

  it('every text listed for the extractor is in the catalog', () => {
    const listed = MOVE_SPLIT_ROUTE_TEXTS.map((descriptor) => descriptor.message);

    expect(listed.filter((text) => text === undefined || !(text in CATALOG))).toEqual([]);
  });
});
