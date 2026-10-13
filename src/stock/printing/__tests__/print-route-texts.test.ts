import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { PRINT_ROUTE_TEXTS } from 'src/stock/printing/commands/print-picking-ready.front-component';
import { PRINT_MESSAGES } from 'src/stock/printing/print-messages.constant';

// The catalog the routes translate with: a text missing here reaches the user untranslated.
const CATALOG = JSON.parse(readFileSync('locales/en.json', 'utf8')) as Record<string, unknown>;

describe('print route texts', () => {
  it('lists every text the print route answers, as the route writes it', () => {
    expect(PRINT_ROUTE_TEXTS.map((descriptor) => descriptor.message)).toEqual(Object.values(PRINT_MESSAGES));
  });

  it('every listed text is in the catalog', () => {
    const listed = PRINT_ROUTE_TEXTS.map((descriptor) => descriptor.message);

    expect(listed.filter((text) => text === undefined || !(text in CATALOG))).toEqual([]);
  });
});
