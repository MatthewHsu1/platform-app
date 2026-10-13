import { describe, expect, it } from 'vitest';

import {
  allocationCandidateFilter,
  assignableLeadFilter,
  leadDayCountFilter,
  withinIds,
} from 'src/crm/assignment/utils/assignment-filters.util';

const NOW = new Date('2026-10-09T12:00:00.000Z');

describe('assignment filters', () => {
  it('looks for pending leads with no team and no salesperson, old enough and recent enough', () => {
    expect(
      allocationCandidateFilter({ teamFilter: { leadType: { eq: 'LEAD' } }, now: NOW, delayHours: 2, creationDeltaDays: 7 }),
    ).toEqual({
      and: [
        { leadType: { eq: 'LEAD' } },
        { createdAt: { lte: '2026-10-09T10:00:00.000Z' } },
        { teamId: { is: 'NULL' } },
        { salespersonId: { is: 'NULL' } },
        { wonStatus: { eq: 'PENDING' } },
        { createdAt: { gt: '2026-10-02T12:00:00.000Z' } },
      ],
    });
  });

  it('takes leads of any age when the day window is zero', () => {
    expect(allocationCandidateFilter({ teamFilter: null, now: NOW, delayHours: 0, creationDeltaDays: 0 })).toEqual({
      and: [
        { createdAt: { lte: '2026-10-09T12:00:00.000Z' } },
        { teamId: { is: 'NULL' } },
        { salespersonId: { is: 'NULL' } },
        { wonStatus: { eq: 'PENDING' } },
      ],
    });
  });

  it('looks for leads of the teams with no salesperson and no assignment date that are not lost', () => {
    expect(assignableLeadFilter(['T1', 'T2'])).toEqual({
      and: [
        { salespersonId: { is: 'NULL' } },
        { dateOpen: { is: 'NULL' } },
        { teamId: { in: ['T1', 'T2'] } },
        { or: [{ wonStatus: { neq: 'LOST' } }, { wonStatus: { is: 'NULL' } }] },
      ],
    });
  });

  it('counts leads given in the window whatever their status', () => {
    expect(leadDayCountFilter({ teamIds: ['T'], userIds: ['u1'], since: new Date('2026-10-08T12:00:00.000Z') })).toEqual({
      and: [{ dateOpen: { gte: '2026-10-08T12:00:00.000Z' } }, { teamId: { in: ['T'] } }, { salespersonId: { in: ['u1'] } }],
    });
  });

  it('limits a filter to some leads', () => {
    expect(withinIds(null, ['l1'])).toEqual({ id: { in: ['l1'] } });
    expect(withinIds({ probability: { gt: 1 } }, ['l1'])).toEqual({ and: [{ probability: { gt: 1 } }, { id: { in: ['l1'] } }] });
  });
});
