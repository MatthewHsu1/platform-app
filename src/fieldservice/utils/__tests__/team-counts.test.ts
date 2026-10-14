import { describe, expect, it } from 'vitest';

import { teamCounts } from 'src/fieldservice/utils/team-counts.util';
import { orderRow } from 'src/fieldservice/utils/__tests__/job-fixtures';

describe('teamCounts', () => {
  it('counts open, unassigned and unscheduled, skipping closed orders', () => {
    const counts = teamCounts([
      orderRow(),
      orderRow({ workerId: 'w1' }),
      orderRow({ closed: true, stageClosedStatus: 'COMPLETED' }),
    ]);
    expect(counts).toEqual({ open: 2, needAssign: 1, needSchedule: 2 });
  });
});
