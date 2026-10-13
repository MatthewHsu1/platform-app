import { describe, expect, it } from 'vitest';

import { type FilterCheck } from 'src/crm/assignment/types/filter-check.type';
import { planFilterUndo } from 'src/crm/assignment/utils/plan-filter-undo.util';

const check = (overrides: Partial<FilterCheck>): FilterCheck => ({
  recordId: 'T1',
  operation: 'updated',
  field: 'assignmentDomain',
  before: '{"rules":[]}',
  after: '{"rules":[{"field":"budget"}]}',
  workspaceMemberId: 'wm1',
  ...overrides,
});

describe('planFilterUndo', () => {
  it('removes a created row whose filter cannot run', () => {
    expect(planFilterUndo([{ check: check({ operation: 'created', before: null }), reason: 'Unknown field "budget".' }])).toEqual({
      destroy: [{ recordId: 'T1', reasons: ['Unknown field "budget".'], workspaceMemberId: 'wm1' }],
      putBack: [],
    });
  });

  it('puts the previous filter back on an updated row', () => {
    expect(planFilterUndo([{ check: check({}), reason: 'Unknown field "budget".' }])).toEqual({
      destroy: [],
      putBack: [{ recordId: 'T1', data: { assignmentDomain: '{"rules":[]}' }, reasons: ['Unknown field "budget".'], workspaceMemberId: 'wm1' }],
    });
  });

  it('puts both filters of one updated row back in one write', () => {
    const plan = planFilterUndo([
      { check: check({ recordId: 'M1', before: null }), reason: 'first' },
      { check: check({ recordId: 'M1', field: 'assignmentDomainPreferred', before: 'old' }), reason: 'second' },
    ]);

    expect(plan.putBack).toEqual([
      { recordId: 'M1', data: { assignmentDomain: null, assignmentDomainPreferred: 'old' }, reasons: ['first', 'second'], workspaceMemberId: 'wm1' },
    ]);
  });

  it('removes a created row once when both its filters cannot run', () => {
    const plan = planFilterUndo([
      { check: check({ recordId: 'M1', operation: 'created', before: null }), reason: 'first' },
      { check: check({ recordId: 'M1', operation: 'created', field: 'assignmentDomainPreferred', before: null }), reason: 'second' },
    ]);

    expect(plan).toEqual({ destroy: [{ recordId: 'M1', reasons: ['first', 'second'], workspaceMemberId: 'wm1' }], putBack: [] });
  });
});
