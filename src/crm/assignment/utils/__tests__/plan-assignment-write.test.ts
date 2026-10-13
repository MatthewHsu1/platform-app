import { describe, expect, it } from 'vitest';

import { type LeadRow } from 'src/crm/lead/types/lead-row.type';
import { type StageRow } from 'src/crm/lead/types/stage-row.type';
import { planAssignmentWrite } from 'src/crm/assignment/utils/plan-assignment-write.util';

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

const lead = (values: Partial<LeadRow>) => ({ id: 'l1', leadType: 'LEAD', wonStatus: 'PENDING', stageId: null, teamId: 'T', ...values }) as LeadRow;

describe('planAssignmentWrite', () => {
  it('converts a lead, dates the conversion and gives it the first stage of its team, folded or not', () => {
    const stages = [stage('other-team', 0, { teamIds: ['X'] }), stage('folded', 1, { fold: true }), stage('qualified', 2, { teamIds: ['T'] })];

    expect(planAssignmentWrite({ lead: lead({}), salespersonId: 'u1', stages, now: NOW })).toEqual({
      salespersonId: 'u1',
      dateOpen: NOW,
      leadType: 'OPPORTUNITY',
      dateConversion: NOW,
      stageId: 'folded',
    });
  });

  it('keeps the conversion date and the stage of an opportunity that has them', () => {
    expect(
      planAssignmentWrite({ lead: lead({ leadType: 'OPPORTUNITY', stageId: 's9' }), salespersonId: 'u1', stages: [stage('s1', 1)], now: NOW }),
    ).toEqual({ salespersonId: 'u1', dateOpen: NOW, leadType: 'OPPORTUNITY' });
  });

  it('only gives a won lead its salesperson and assignment date', () => {
    expect(planAssignmentWrite({ lead: lead({ wonStatus: 'WON' }), salespersonId: 'u1', stages: [stage('s1', 1)], now: NOW })).toEqual({
      salespersonId: 'u1',
      dateOpen: NOW,
    });
  });

  it('leaves the stage empty when no stage fits the team', () => {
    expect(
      planAssignmentWrite({ lead: lead({}), salespersonId: 'u1', stages: [stage('s1', 1, { teamIds: ['X'] })], now: NOW }).stageId,
    ).toBeNull();
  });
});
