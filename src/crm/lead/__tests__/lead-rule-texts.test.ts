import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  CONTACT_SYNC_TEXTS,
  CRM_DELETE_REFUSAL_TEXTS,
  LEAD_RULE_TEXTS,
  MARK_WON_TEXTS,
  SALES_TEAM_RULE_TEXTS,
  SCORING_TEXTS,
  UTM_RULE_TEXTS,
} from 'src/crm/lead/actions/mark-won.front-component';
import { SELECT_ONE_LEAD, SELECT_SOME_LEADS } from 'src/crm/lead/actions/lead-action-route';
import { LEADS_NOT_FOUND } from 'src/crm/lead/lead-messages.constant';
import { CONVERT_MESSAGES } from 'src/crm/lead/actions/convert-messages.constant';
import { CONVERT_TEXTS } from 'src/crm/lead/actions/convert-lead.front-component';
import { LEAD_ACTION_TEXTS } from 'src/crm/lead/actions/mark-lost.front-component';
import { MERGE_TEXTS } from 'src/crm/lead/actions/merge-leads.front-component';
import { MERGE_MESSAGES } from 'src/crm/lead/merge/merge-messages.constant';
import { leadRow } from 'src/crm/lead/merge/utils/__tests__/fixtures/lead-row.fixture';
import { planMergeSummary } from 'src/crm/lead/merge/utils/plan-merge-summary.util';
import { PERSON_PUSH_MESSAGES } from 'src/crm/lead/apply-person-pushes';
import {
  AUTOMATIC_ALREADY,
  AUTOMATIC_NOT_PENDING,
  LOST_COMMENT_TITLE,
  MARK_LOST_IN_WON_STAGE,
  MARK_LOST_WON,
  MARK_WON_ALREADY_WON,
  MARK_WON_LOST,
  MARK_WON_NO_STAGE,
  MARK_WON_NOT_OPPORTUNITY,
  RESTORE_NOT_LOST,
} from 'src/crm/lead/actions/utils/plan-won-lost.util';
import { DEFAULT_OPPORTUNITY_NAME_TEMPLATE } from 'src/crm/lead/utils/plan-lead-computes.util';
import { WON_STAGE_REFUSAL_MESSAGE } from 'src/crm/lead/utils/won-stage-refusal.util';
import { LOST_REASON_IN_USE_MESSAGE } from 'src/crm/lost-reason/run-lost-reason-trigger';
import { SCORING_MESSAGES } from 'src/crm/scoring/scoring-messages.constant';
import { STAGE_IN_USE_MESSAGE } from 'src/crm/stage/run-stage-trigger';
import { TEAM_MESSAGES } from 'src/sales-team/team/team-messages';
import { NOT_ALLOWED_MESSAGE } from 'src/shared/not-allowed';
import { UTM_MESSAGES } from 'src/utm/utm-messages';

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

  it('lists the note of a contact that cannot take a lead email, and the catalog holds it', () => {
    const notes = Object.values(PERSON_PUSH_MESSAGES);

    expect(CONTACT_SYNC_TEXTS.map((descriptor) => descriptor.message)).toEqual(notes);
    expect(notes.filter((text) => !(text in CATALOG))).toEqual([]);
  });

  it('lists every note and error of the campaign rules, and the catalog holds each', () => {
    const texts = Object.values(UTM_MESSAGES);

    expect(UTM_RULE_TEXTS.map((descriptor) => descriptor.message)).toEqual(texts);
    expect(texts.filter((text) => !(text in CATALOG))).toEqual([]);
  });

  it('lists every answer of the Update probabilities route, and the catalog holds each', () => {
    const texts = Object.values(SCORING_MESSAGES);

    expect(SCORING_TEXTS.map((descriptor) => descriptor.message)).toEqual(texts);
    expect(texts.filter((text) => !(text in CATALOG))).toEqual([]);
  });

  it('lists every refusal of Mark won, and the catalog holds each answer of its route', () => {
    const listed = MARK_WON_TEXTS.map((descriptor) => descriptor.message);

    expect(listed).toEqual(
      expect.arrayContaining([MARK_WON_NOT_OPPORTUNITY, MARK_WON_ALREADY_WON, MARK_WON_LOST, MARK_WON_NO_STAGE, NOT_ALLOWED_MESSAGE]),
    );
    expect(listed.filter((text) => !(text in CATALOG))).toEqual([]);
  });

  it('lists every answer of the Mark lost, Restore and Use automatic probability routes, and the catalog holds each', () => {
    const texts = [
      SELECT_ONE_LEAD,
      SELECT_SOME_LEADS,
      LEADS_NOT_FOUND,
      MARK_LOST_WON,
      MARK_LOST_IN_WON_STAGE,
      LOST_COMMENT_TITLE,
      RESTORE_NOT_LOST,
      AUTOMATIC_NOT_PENDING,
      AUTOMATIC_ALREADY,
    ];

    expect(LEAD_ACTION_TEXTS.map((descriptor) => descriptor.message)).toEqual(texts);
    expect(texts.filter((text) => !(text in CATALOG))).toEqual([]);
  });

  it('lists every answer and note of the convert buttons, and the catalog holds each', () => {
    const texts = Object.values(CONVERT_MESSAGES);

    expect(CONVERT_TEXTS.map((descriptor) => descriptor.message)).toEqual(texts);
    expect(texts.filter((text) => !(text in CATALOG))).toEqual([]);
  });

  it('lists every text of the merge and its summary note, and the catalog holds each', () => {
    const used = new Set<string>(Object.values(MERGE_MESSAGES));
    const label = (message: string) => {
      used.add(message);
      return message;
    };
    const filled = {
      createdAt: '2026-02-01T00:00:00.000Z',
      name: 'Gym',
      probability: 40,
      lostReasonId: 'reason',
      dateDeadline: '2026-03-01',
      description: { markdown: 'Notes' },
      language: 'en',
      referred: 'Ann',
      tags: ['Gym'],
      salespersonId: 'member',
      teamId: 'team',
      contactName: 'Ann',
      partnerName: 'Gym Inc',
      jobPosition: 'Owner',
      emailFrom: { primaryEmail: 'ann@gym.example', additionalEmails: null },
      phone: { primaryPhoneNumber: '2025550123', primaryPhoneCountryCode: 'US', primaryPhoneCallingCode: '+1', additionalPhones: null },
      website: { primaryLinkUrl: 'gym.example', primaryLinkLabel: null, secondaryLinks: null },
      contactAddress: {
        addressStreet1: '1 Main St',
        addressStreet2: null,
        addressCity: 'Austin',
        addressPostcode: null,
        addressState: null,
        addressCountry: null,
      },
      campaignId: 'campaign',
      mediumId: 'medium',
      sourceId: 'source',
      stageId: 'stage',
    };
    const tails = [
      leadRow({ ...filled, id: 'a', leadType: 'OPPORTUNITY', priority: 'LOW', expectedRevenue: { amountMicros: 1e9, currencyCode: 'USD' } }),
      leadRow({ ...filled, id: 'b', priority: 'MEDIUM', recurringRevenue: { amountMicros: 1e9, currencyCode: 'USD' } }),
      leadRow({ ...filled, id: 'c', priority: 'HIGH' }),
      leadRow({ ...filled, id: 'd', priority: 'VERY_HIGH' }),
    ];
    const names = { stage: 'Stage', member: 'Ann', team: 'Team', reason: 'Price', campaign: 'Spring', medium: 'Email', source: 'Web' };

    planMergeSummary({
      tails,
      names: {
        stages: names,
        teams: names,
        members: names,
        plans: names,
        lostReasons: names,
        campaigns: names,
        mediums: names,
        sources: names,
      },
      label,
    });
    const listed = new Set(MERGE_TEXTS.map((descriptor) => descriptor.message));

    expect([...used].filter((text) => !listed.has(text))).toEqual([]);
    expect([...listed].filter((text) => !(text in CATALOG))).toEqual([]);
  });
});
