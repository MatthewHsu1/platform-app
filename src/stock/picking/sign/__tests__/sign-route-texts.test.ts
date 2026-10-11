import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { SIGN_ROUTE_TEXTS } from 'src/stock/picking/sign/sign.front-component';
import { SIGN_MESSAGES } from 'src/stock/picking/sign/sign-messages.constant';

// The catalog the routes translate with: a text missing here reaches the user untranslated.
const CATALOG = JSON.parse(readFileSync('locales/en.json', 'utf8')) as Record<string, unknown>;

describe('sign route texts', () => {
  it('lists every text the sign route answers or writes, as the route writes it', () => {
    expect(SIGN_ROUTE_TEXTS.map((descriptor) => descriptor.message)).toEqual(Object.values(SIGN_MESSAGES));
  });

  it('every listed text is in the catalog', () => {
    const listed = SIGN_ROUTE_TEXTS.map((descriptor) => descriptor.message);

    expect(listed.filter((text) => text === undefined || !(text in CATALOG))).toEqual([]);
  });
});
