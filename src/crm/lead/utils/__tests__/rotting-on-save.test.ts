import { describe, expect, it } from 'vitest';

import { type LeadContext } from 'src/crm/lead/types/lead-context.type';
import { planLeadComputes } from 'src/crm/lead/utils/plan-lead-computes.util';
import { composeLeadWrite } from 'src/crm/lead/utils/plan-lead-write.util';
import { lead, STAGES } from 'src/crm/scoring/utils/__tests__/scoring-fixtures';

const context: LeadContext = {
  stages: [{ ...STAGES[0], rottingThresholdDays: 5 }, { ...STAGES[1], rottingThresholdDays: 3 }, ...STAGES.slice(2)],
  recurringPlanMonths: new Map(),
  teams: [],
  memberships: [],
  people: new Map(),
  companies: new Map(),
};

describe('rotting on save', () => {
  it('flags an opportunity when it is saved long after its last stage change', () => {
    const stale = lead({ id: 's', stageId: 'new', dateLastStageUpdate: '2025-01-10T12:00:00.000Z', name: 'Deal', createdAt: '2025-01-01T00:00:00.000Z' });
    const result = planLeadComputes({
      operation: 'updated',
      before: stale,
      lead: { ...stale, name: 'Deal renamed' },
      written: new Set(['name']),
      staffSave: true,
      now: '2025-01-20T12:00:00.000Z',
      context,
    });

    expect(result).toMatchObject({ isRotting: true, rottingDays: 10 });
  });

  it('clears the flag when staff move a rotting opportunity to another stage', () => {
    const rotting = lead({
      id: 'r',
      stageId: 'new',
      dateLastStageUpdate: '2025-01-10T12:00:00.000Z',
      name: 'Opportunity',
      createdAt: '2025-01-10T12:00:00.000Z',
      isRotting: true,
      rottingDays: 10,
    });
    const plan = composeLeadWrite({
      operation: 'updated',
      current: { ...rotting, stageId: 'qualified' },
      steps: [{ before: rotting, after: { ...rotting, stageId: 'qualified' }, written: new Set(['stageId']), staff: true, creatorMemberId: null }],
      now: '2025-01-20T12:00:00.000Z',
      context,
    });

    expect(plan).toMatchObject({ kind: 'write', data: { isRotting: false, rottingDays: 0 } });
  });
});
