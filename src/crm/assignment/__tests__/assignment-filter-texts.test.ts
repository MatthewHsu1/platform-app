import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { FILTER_ERROR_TEXTS } from 'src/crm/assignment/front/team-assignment-filter.front-component';
import { FILTER_ERROR_MESSAGES } from 'src/shared/filter-editor/filter-error-messages.constant';

// The catalog filter errors are translated with: a text missing here reaches the user untranslated.
const CATALOG = JSON.parse(readFileSync('locales/en.json', 'utf8')) as Record<string, unknown>;

describe('assignment filter texts', () => {
  it('lists every filter error for the extractor, and the catalog holds each', () => {
    const messages = Object.values(FILTER_ERROR_MESSAGES);

    expect(FILTER_ERROR_TEXTS.map((descriptor) => descriptor.message)).toEqual(messages);
    expect(messages.filter((text) => !(text in CATALOG))).toEqual([]);
  });
});
