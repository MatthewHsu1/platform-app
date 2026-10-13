import { describe, expect, it } from 'vitest';

import { planCaseSlaSummary } from 'src/helpdesk-sla/utils/plan-case-sla-summary.util';
import { h } from 'src/helpdesk-sla/utils/__tests__/sla-fixtures';

describe('planCaseSlaSummary', () => {
  it('takes the earliest deadline of the rows in progress', () => {
    expect(
      planCaseSlaSummary([
        { state: 'IN_PROGRESS', deadline: h(4) },
        { state: 'IN_PROGRESS', deadline: h(2) },
        { state: 'ACCOMPLISHED', deadline: h(1) },
      ]),
    ).toEqual({ slaDeadline: h(2), slaStateExpired: false });
  });

  it('has no deadline while every row is paused, done or expired, and flags an expired row', () => {
    expect(
      planCaseSlaSummary([
        { state: 'ON_HOLD', deadline: h(5) },
        { state: 'EXPIRED', deadline: h(2) },
      ]),
    ).toEqual({ slaDeadline: null, slaStateExpired: true });
    expect(planCaseSlaSummary([])).toEqual({ slaDeadline: null, slaStateExpired: false });
  });
});
