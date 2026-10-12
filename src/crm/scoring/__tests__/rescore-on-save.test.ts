import { describe, expect, it } from 'vitest';

import { lead, row, STAGES } from 'src/crm/scoring/utils/__tests__/scoring-fixtures';
import { scoreLeads } from 'src/crm/scoring/utils/score-leads.util';

// The T1 and T2 rows after the rebuild of the fourteen-lead example and the
// win of lead 9.
const ROWS = [
  row('T1', 'stage', 'new', 1.1, 2.1),
  row('T1', 'stage', 'qualified', 1.1, 1.1),
  row('T1', 'stage', 'proposition', 1.1, 0.1),
  row('T1', 'stage', 'won', 1.1, 0.1),
  row('T1', 'country', 'c0', 0.1, 1.1),
  row('T1', 'country', 'c1', 0.1, 1.1),
  row('T1', 'country', 'c2', 1.1, 0.1),
  row('T1', 'state', 's0', 0.1, 1.1),
  row('T1', 'state', 's1', 0.1, 1.1),
  row('T1', 'state', 's2', 1.1, 0.1),
  row('T1', 'source', 'src0', 0.1, 1.1),
  row('T1', 'source', 'src1', 0.1, 1.1),
  row('T1', 'source', 'src2', 1.1, 0.1),
  row('T1', 'emailState', 'False', 1.1, 2.1),
  row('T1', 'phoneState', 'False', 1.1, 2.1),
  row('T2', 'stage', 'new', 2.1, 2.1),
  row('T2', 'stage', 'qualified', 2.1, 2.1),
  row('T2', 'stage', 'proposition', 2.1, 1.1),
  row('T2', 'stage', 'won', 2.1, 0.1),
  row('T2', 'country', 'c0', 1.1, 2.1),
  row('T2', 'country', 'c1', 1.1, 0.1),
  row('T2', 'state', 's0', 1.1, 0.1),
  row('T2', 'state', 's1', 0.1, 2.1),
  row('T2', 'state', 's2', 1.1, 0.1),
  row('T2', 'source', 'src1', 1.1, 1.1),
  row('T2', 'source', 'src2', 1.1, 1.1),
  row('T2', 'emailState', 'False', 2.1, 2.1),
  row('T2', 'phoneState', 'False', 2.1, 2.1),
];
const FIELDS = ['country', 'state', 'emailState', 'phoneState', 'source', 'tags'] as const;

describe('rescoring a lead when it is saved', () => {
  it('gives the two example leads moved to the first stage their new scores', () => {
    const leadThree = lead({ id: '3', teamId: 'T1', stageId: 'new', country: 'c0', state: 's1', sourceId: 'src2' });
    const leadEight = lead({ id: '8', teamId: 'T2', stageId: 'new', country: 'c0', state: 's1', sourceId: 'src2' });
    const scores = scoreLeads([leadThree, leadEight], ROWS, STAGES, FIELDS);

    expect(scores.get('3')).toBe(20.87);
    expect(scores.get('8')).toBe(2.43);
  });

  it('follows a change of country', () => {
    const leadEight = lead({ id: '8', teamId: 'T2', stageId: 'new', country: 'c1', state: 's1', sourceId: 'src2' });

    expect(scoreLeads([leadEight], ROWS, STAGES, FIELDS).get('8')).toBe(34.38);
  });
});
