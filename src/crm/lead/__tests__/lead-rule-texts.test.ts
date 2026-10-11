import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { CRM_DELETE_REFUSAL_TEXTS, LEAD_RULE_TEXTS, MARK_WON_TEXTS, SALES_TEAM_RULE_TEXTS } from 'src/crm/lead/actions/mark-won.front-component';
import {
  MARK_WON_ALREADY_WON,
  MARK_WON_LOST,
  MARK_WON_NO_STAGE,
  MARK_WON_NOT_OPPORTUNITY,
} from 'src/crm/lead/actions/utils/plan-won-lost.util';
import { DEFAULT_OPPORTUNITY_NAME_TEMPLATE } from 'src/crm/lead/utils/plan-lead-computes.util';
import { WON_STAGE_REFUSAL_MESSAGE } from 'src/crm/lead/utils/won-stage-refusal.util';
import { LOST_REASON_IN_USE_MESSAGE } from 'src/crm/lost-reason/run-lost-reason-trigger';
import { STAGE_IN_USE_MESSAGE } from 'src/crm/stage/run-stage-trigger';
import { TEAM_MESSAGES } from 'src/sales-team/team/team-messages';
import { NOT_ALLOWED_MESSAGE } from 'src/shared/not-allowed';

// The catalog the lead rules translate with: a text missing here reaches the user untranslated.
const CATALOG = JSON.parse(readFileSync('locales/en.json', 'utf8')) as Record<string, unknown>;

describe('lead rule texts', () => {
  it('lists every text the lead rules answer for the extractor, and the catalog holds each', () => {
    const rules = [WON_STAGE_REFUSAL_MESSAGE, DEFAULT_OPPORTUNITY_NAME_TEMPLATE];

    expect(LEAD_RULE_TEXTS.map((descriptor) => descriptor.message)).toEqual(rules);
    expect(rules.filter((text) => !(text in CATALOG))).toEqual([]);
  });

  it('lists the notes of an undone stage or lost reason delete, and the catalog holds each', () => {
    const notes = [STAGE_IN_USE_MESSAGE, LOST_REASON_IN_USE_MESSAGE];

    expect(CRM_DELETE_REFUSAL_TEXTS.map((descriptor) => descriptor.message)).toEqual(notes);
    expect(notes.filter((text) => !(text in CATALOG))).toEqual([]);
  });

  it('lists every note of the sales team rules, and the catalog holds each', () => {
    const notes = Object.values(TEAM_MESSAGES);

    expect(SALES_TEAM_RULE_TEXTS.map((descriptor) => descriptor.message)).toEqual(notes);
    expect(notes.filter((text) => !(text in CATALOG))).toEqual([]);
  });

  it('lists every refusal of Mark won, and the catalog holds each answer of its route', () => {
    const listed = MARK_WON_TEXTS.map((descriptor) => descriptor.message);

    expect(listed).toEqual(
      expect.arrayContaining([MARK_WON_NOT_OPPORTUNITY, MARK_WON_ALREADY_WON, MARK_WON_LOST, MARK_WON_NO_STAGE, NOT_ALLOWED_MESSAGE]),
    );
    expect(listed.filter((text) => !(text in CATALOG))).toEqual([]);
  });
});
