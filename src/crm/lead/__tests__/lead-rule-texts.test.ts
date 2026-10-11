import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { LEAD_RULE_TEXTS } from 'src/crm/lead/actions/mark-won.front-component';
import { DEFAULT_OPPORTUNITY_NAME_TEMPLATE } from 'src/crm/lead/utils/plan-lead-computes.util';
import { WON_STAGE_REFUSAL_MESSAGE } from 'src/crm/lead/utils/won-stage-refusal.util';

// The catalog the lead rules translate with: a text missing here reaches the user untranslated.
const CATALOG = JSON.parse(readFileSync('locales/en.json', 'utf8')) as Record<string, unknown>;

describe('lead rule texts', () => {
  it('lists every text the lead rules answer for the extractor, and the catalog holds each', () => {
    const rules = [WON_STAGE_REFUSAL_MESSAGE, DEFAULT_OPPORTUNITY_NAME_TEMPLATE];

    expect(LEAD_RULE_TEXTS.map((descriptor) => descriptor.message)).toEqual(rules);
    expect(rules.filter((text) => !(text in CATALOG))).toEqual([]);
  });
});
