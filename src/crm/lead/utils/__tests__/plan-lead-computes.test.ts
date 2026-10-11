import { describe, expect, it } from 'vitest';

import { readLeadRow } from 'src/crm/lead/lead-selection';
import { type LeadContext } from 'src/crm/lead/types/lead-context.type';
import { type LeadRow } from 'src/crm/lead/types/lead-row.type';
import { type StageRow } from 'src/crm/lead/types/stage-row.type';
import { planLeadComputes } from 'src/crm/lead/utils/plan-lead-computes.util';

const NOW = '2026-10-09T12:00:00.000Z';
const stage = (id: string, sequence: number, extra: Partial<StageRow> = {}): StageRow => ({
  id,
  name: id,
  sequence,
  isWon: false,
  fold: false,
  rottingThresholdDays: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
  teamIds: [],
  ...extra,
});
const context = (extra: Partial<LeadContext> = {}): LeadContext => ({
  stages: [stage('new', 1), stage('qualified', 2), stage('t2New', 1, { teamIds: ['T2'] }), stage('won', 70, { isWon: true })],
  recurringPlanMonths: new Map([['yearly', 12]]),
  teams: [],
  memberships: [],
  people: new Map([
    ['p1', { id: 'p1', name: { firstName: 'Ann', lastName: 'Lee' }, emails: null, phones: null, jobTitle: null, companyId: null }],
  ]),
  companies: new Map([['c1', { id: 'c1', name: 'Acme Gym', domainName: null, address: null }]]),
  ...extra,
});
const lead = (values: Record<string, unknown>): LeadRow =>
  readLeadRow({ id: 'l1', createdAt: '2026-09-01T09:00:00.000Z', leadType: 'OPPORTUNITY', wonStatus: 'PENDING', ...values });
const compute = (before: LeadRow | null, after: LeadRow, written: string[], extra: Partial<LeadContext> = {}) =>
  planLeadComputes({
    operation: before === null ? 'created' : 'updated',
    before,
    lead: after,
    written: new Set(written),
    staffSave: true,
    now: NOW,
    context: context(extra),
  });

describe('stage repair', () => {
  it('moves a lead to the first stage of its new team when its stage belongs to other teams', () => {
    const before = lead({ stageId: 't2New', teamId: 'T2' });

    expect(compute(before, { ...before, teamId: 'T1' }, ['teamId']).stageId).toBe('new');
  });

  it('keeps a stage the save chose itself', () => {
    const before = lead({ stageId: 't2New', teamId: 'T2' });

    expect(compute(before, { ...before, teamId: 'T1', stageId: 't2New' }, ['teamId', 'stageId']).stageId).toBeUndefined();
  });
});

describe('team default', () => {
  const teamsOfU: Partial<LeadContext> = {
    stages: [stage('new', 1), stage('t2First', 0, { teamIds: ['T2'] })],
    teams: [
      {
        id: 'T2',
        name: 'T2',
        sequence: 1,
        createdAt: '2026-01-01T00:00:00.000Z',
        active: true,
        leaderId: 'U',
        useLeads: false,
        useOpportunities: true,
        assignmentOptout: false,
        assignmentMax: 0,
        assignmentDomain: null,
        color: null,
        seedKey: null,
      },
    ],
  };

  it("gives a new lead its salesperson's team, then the first stage of that team", () => {
    const values = compute(null, lead({ salespersonId: 'U' }), ['salespersonId'], teamsOfU);

    expect(values).toMatchObject({ teamId: 'T2', stageId: 't2First' });
  });
});

describe('default name', () => {
  it("names an unnamed lead after its contact's full name", () => {
    expect(compute(null, lead({ name: '', personId: 'p1', stageId: 'new' }), ['personId']).name).toBe("Ann Lee's opportunity");
  });

  it('names an unnamed lead after its customer when it has no contact', () => {
    expect(compute(null, lead({ name: null, companyId: 'c1', stageId: 'new' }), ['companyId']).name).toBe("Acme Gym's opportunity");
  });

  it('keeps a name staff typed', () => {
    expect(compute(null, lead({ name: 'Gym deal', personId: 'p1', stageId: 'new' }), ['name', 'personId']).name).toBeUndefined();
  });
});

describe('automatic probability', () => {
  const score = () => 25;

  it('lets an automatic probability follow the new score after a stage change', () => {
    const before = lead({ stageId: 'new', probability: 40, automatedProbability: 40 });

    expect(compute(before, { ...before, stageId: 'qualified' }, ['stageId'], { score })).toMatchObject({
      automatedProbability: 25,
      probability: 25,
    });
  });

  it('keeps a probability staff set by hand and updates only the automated value', () => {
    const before = lead({ stageId: 'new', probability: 60, automatedProbability: 40 });
    const values = compute(before, { ...before, stageId: 'qualified' }, ['stageId'], { score });

    expect(values.automatedProbability).toBe(25);
    expect(values.probability).toBeUndefined();
  });

  it('compares probabilities at two decimals', () => {
    const before = lead({ stageId: 'new', probability: 40.001, automatedProbability: 40 });

    expect(compute(before, { ...before, stageId: 'qualified' }, ['stageId'], { score }).probability).toBe(25);
  });

  it('rounds each probability to two decimals before comparing them', () => {
    const before = lead({ stageId: 'new', probability: 40.004, automatedProbability: 40.006 });

    expect(compute(before, { ...before, stageId: 'qualified' }, ['stageId'], { score }).probability).toBeUndefined();
  });

  it('does not move the probability of a lost lead', () => {
    const before = lead({ stageId: 'new', probability: 0, automatedProbability: 0, wonStatus: 'LOST' });

    expect(compute(before, { ...before, stageId: 'qualified' }, ['stageId'], { score }).probability).toBeUndefined();
  });

  it('changes nothing while no score exists for an open stage', () => {
    const before = lead({ stageId: 'new', probability: 40, automatedProbability: 40 });
    const values = compute(before, { ...before, stageId: 'qualified' }, ['stageId']);

    expect(values.automatedProbability).toBeUndefined();
    expect(values.probability).toBeUndefined();
  });

  it('scores a lead without a stage at 0', () => {
    const before = lead({ stageId: 'new', probability: 40, automatedProbability: 40 });

    expect(compute(before, { ...before, stageId: null }, ['stageId'])).toMatchObject({ automatedProbability: 0, probability: 0 });
  });
});

describe('won status', () => {
  // A lead won in a stage that has since stopped being won.
  const wonEarlier = () => lead({ stageId: 'qualified', probability: 100, automatedProbability: 100, wonStatus: 'WON', dateClosed: '2026-10-01T09:00:00.000Z' });

  it('keeps a lead won when a save writes none of probability, stage or status', () => {
    const before = wonEarlier();

    expect(compute(before, { ...before, name: 'Renamed' }, ['name']).wonStatus).toBeUndefined();
  });

  it('recomputes the status once the probability is written', () => {
    const before = wonEarlier();

    expect(compute(before, { ...before, probability: 90 }, ['probability']).wonStatus).toBe('PENDING');
  });
});

describe('derived values', () => {
  it('recomputes money, quality and day counts from the row', () => {
    const before = lead({ stageId: 'new' });
    const after = lead({
      stageId: 'new',
      probability: 50,
      expectedRevenue: { amountMicros: 2_000_000_000, currencyCode: 'USD' },
      recurringRevenue: { amountMicros: 1_200_000_000, currencyCode: 'USD' },
      recurringPlanId: 'yearly',
      website: { primaryLinkUrl: 'acme.example', primaryLinkLabel: '', secondaryLinks: null },
      emailFrom: { primaryEmail: 'ann@acme.example', additionalEmails: null },
      dateOpen: '2026-09-03T09:00:00.000Z',
    });

    expect(compute(before, after, ['probability'])).toMatchObject({
      proratedRevenue: { amountMicros: 1_000_000_000, currencyCode: 'USD' },
      recurringRevenueMonthly: { amountMicros: 100_000_000, currencyCode: 'USD' },
      recurringRevenueMonthlyProrated: { amountMicros: 50_000_000, currencyCode: 'USD' },
      website: { primaryLinkUrl: 'http://acme.example' },
      emailState: 'CORRECT',
      dayOpen: 2,
    });
  });
});
