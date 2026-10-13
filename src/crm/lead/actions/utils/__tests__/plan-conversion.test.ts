import { describe, expect, it } from 'vitest';

import { planAllocation, planConversion } from 'src/crm/lead/actions/utils/plan-conversion.util';
import { leadRow, SAMPLE_STAGES } from 'src/crm/lead/merge/utils/__tests__/fixtures/lead-row.fixture';

const NOW = '2026-10-09T12:00:00.000Z';
const at = (second: number) => `2026-02-01T00:00:${String(second).padStart(2, '0')}.000Z`;

describe('planConversion', () => {
  it('turns a lead into an opportunity, links its customer and gives it the first stage of its team', () => {
    const lead = leadRow({ id: 'l', createdAt: at(1), teamId: 'team-1' });

    expect(planConversion({ lead, customer: { personId: 'p', companyId: 'c' }, stages: SAMPLE_STAGES, now: NOW })).toEqual({
      leadType: 'OPPORTUNITY',
      dateConversion: NOW,
      personId: 'p',
      companyId: 'c',
      stageId: 'team1-1',
    });
  });

  it('takes the first team-free stage when the lead has no team, and keeps a stage it has', () => {
    const noTeam = leadRow({ id: 'l', createdAt: at(1) });
    const staged = leadRow({ id: 'm', createdAt: at(2), stageId: 'team1-2', teamId: 'team-1' });

    expect(planConversion({ lead: noTeam, customer: { personId: null, companyId: null }, stages: SAMPLE_STAGES, now: NOW })).toEqual({
      leadType: 'OPPORTUNITY',
      dateConversion: NOW,
      stageId: 'gen-1',
    });
    expect(planConversion({ lead: staged, customer: { personId: null, companyId: null }, stages: SAMPLE_STAGES, now: NOW })).toEqual({
      leadType: 'OPPORTUNITY',
      dateConversion: NOW,
    });
  });

  it('keeps the conversion date of an opportunity', () => {
    const opportunity = leadRow({ id: 'o', createdAt: at(1), leadType: 'OPPORTUNITY', stageId: 'gen-1', dateConversion: '2026-01-01T00:00:00.000Z' });

    expect(planConversion({ lead: opportunity, customer: { personId: null, companyId: null }, stages: SAMPLE_STAGES, now: NOW })).toEqual({});
  });

  it('converts neither a lost nor a won lead', () => {
    const lost = leadRow({ id: 'x', createdAt: at(1), wonStatus: 'LOST' });
    const won = leadRow({ id: 'w', createdAt: at(2), wonStatus: 'WON', stageId: 'gen-won', probability: 100 });

    expect(planConversion({ lead: lost, customer: { personId: 'p', companyId: null }, stages: SAMPLE_STAGES, now: NOW })).toEqual({});
    expect(planConversion({ lead: won, customer: { personId: 'p', companyId: null }, stages: SAMPLE_STAGES, now: NOW })).toEqual({});
  });
});

describe('planAllocation', () => {
  const leads = [
    leadRow({ id: 'a', createdAt: at(1), salespersonId: 'user-sales-leads' }),
    leadRow({ id: 'b', createdAt: at(2) }),
    leadRow({ id: 'c', createdAt: at(3), wonStatus: 'WON' }),
    leadRow({ id: 'd', createdAt: at(4), wonStatus: 'LOST' }),
    leadRow({ id: 'e', createdAt: at(5) }),
  ];

  it('hands every lead not lost to the salespersons in turn when forced, won ones too', () => {
    expect(planAllocation({ leads, salespersonIds: ['S1', 'S2'], teamId: null, force: true })).toEqual(
      new Map([
        ['a', { salespersonId: 'S1' }],
        ['b', { salespersonId: 'S2' }],
        ['c', { salespersonId: 'S1' }],
        ['e', { salespersonId: 'S2' }],
      ]),
    );
  });

  it('keeps an existing salesperson when not forced', () => {
    expect(planAllocation({ leads, salespersonIds: ['S1'], teamId: 'team-1', force: false })).toEqual(
      new Map([
        ['b', { salespersonId: 'S1', teamId: 'team-1' }],
        ['c', { salespersonId: 'S1', teamId: 'team-1' }],
        ['e', { salespersonId: 'S1', teamId: 'team-1' }],
      ]),
    );
  });

  it('writes the team alone when no salesperson is chosen', () => {
    expect(planAllocation({ leads: leads.slice(0, 2), salespersonIds: [], teamId: 'team-1', force: true })).toEqual(
      new Map([
        ['a', { teamId: 'team-1' }],
        ['b', { teamId: 'team-1' }],
      ]),
    );
  });

  it('writes nothing with neither salesperson nor team', () => {
    expect(planAllocation({ leads, salespersonIds: [], teamId: null, force: true })).toEqual(new Map());
  });
});
