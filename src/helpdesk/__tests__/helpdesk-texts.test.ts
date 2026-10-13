import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { HELPDESK_RULE_TEXTS } from 'src/helpdesk/actions/assign-to-me.front-component';
import { HELPDESK_ACTION_MESSAGES } from 'src/helpdesk/actions/helpdesk-action-messages.constant';
import { HELPDESK_MESSAGES } from 'src/helpdesk/helpdesk-messages.constant';
import { SLA_RULE_TEXTS } from 'src/helpdesk-sla/actions/refresh-sla.front-component';
import { HELPDESK_SLA_MESSAGES } from 'src/helpdesk-sla/helpdesk-sla-messages.constant';
import { RESOURCE_MESSAGES } from 'src/resource/resource-messages.constant';
import { NOT_ALLOWED_MESSAGE } from 'src/shared/not-allowed';
import { NO_MEMBER_DETAIL } from 'src/shared/route-handlers';

// The catalog the work case rules translate with: a text missing here reaches the user untranslated.
const CATALOG = JSON.parse(readFileSync('locales/en.json', 'utf8')) as Record<string, unknown>;

describe('work case texts', () => {
  it('lists every note and answer of the work case rules for the extractor, and the catalog holds each', () => {
    const texts = [...Object.values(HELPDESK_MESSAGES), ...Object.values(HELPDESK_ACTION_MESSAGES), NOT_ALLOWED_MESSAGE, NO_MEMBER_DETAIL];
    const listed = HELPDESK_RULE_TEXTS.map((descriptor) => descriptor.message);

    expect(texts.filter((text) => !listed.includes(text))).toEqual([]);
    expect(texts.filter((text) => !(text in CATALOG))).toEqual([]);
  });

  it('lists every note of the working-hours and service level rules for the extractor, and the catalog holds each', () => {
    const texts = [...Object.values(RESOURCE_MESSAGES), ...Object.values(HELPDESK_SLA_MESSAGES)];

    expect(SLA_RULE_TEXTS.map((descriptor) => descriptor.message)).toEqual(texts);
    expect(texts.filter((text) => !(text in CATALOG))).toEqual([]);
  });
});
