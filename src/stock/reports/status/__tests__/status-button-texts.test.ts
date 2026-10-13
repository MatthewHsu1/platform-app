import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { STATUS_BUTTON_CATALOG_TEXTS } from 'src/stock/reports/status/picking-returns.front-component';
import { STATUS_BUTTON_TEXTS } from 'src/stock/reports/status/status-button';
import { STATUS_TARGETS_MESSAGES } from 'src/stock/reports/status/status-targets-messages.constant';

// The catalog the button and the route translate with: a text missing here reaches the user untranslated.
const CATALOG = JSON.parse(readFileSync('locales/en.json', 'utf8')) as Record<string, unknown>;

const SHOWN = [...Object.values(STATUS_BUTTON_TEXTS).map((descriptor) => descriptor.message), ...Object.values(STATUS_TARGETS_MESSAGES)];

describe('status button texts', () => {
  it('lists every text the button and the route show, as they write it', () => {
    expect(STATUS_BUTTON_CATALOG_TEXTS.map((descriptor) => descriptor.message)).toEqual(SHOWN);
  });

  it('every text the button and the route show is in the catalog', () => {
    expect(SHOWN.filter((text) => text === undefined || !(text in CATALOG))).toEqual([]);
  });
});
