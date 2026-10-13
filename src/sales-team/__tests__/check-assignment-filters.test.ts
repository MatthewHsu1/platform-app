import { describe, expect, it } from 'vitest';

import { makeCheckAssignmentFilters } from 'src/sales-team/check-assignment-filters';
import { type AssignmentFilterChange } from 'src/sales-team/types/assignment-filter-change.type';
import { FilterError } from 'src/shared/filter-editor/to-twenty-filter';
import { GraphqlInputError } from 'src/shared/twenty-graphql';

const FILTER = '{"combinator":"and","rules":[{"field":"probability","operator":">","value":"10"}]}';

const change = (operation: AssignmentFilterChange['operation']): AssignmentFilterChange => ({
  recordId: 'T',
  operation,
  field: 'assignmentDomain',
  before: null,
  after: FILTER,
  staffChange: true,
  workspaceMemberId: 'admin',
});

const setup = (failure: Error) => {
  const putBacks: string[] = [];
  const check = makeCheckAssignmentFilters({
    readStored: async () => [{ id: 'T', assignmentDomain: FILTER }],
    runFilter: async () => {
      throw failure;
    },
    putBack: async ({ recordId }) => {
      putBacks.push(recordId);
    },
    memberLocale: async () => 'en',
  });

  return { check, putBacks };
};

describe('the filter check on save', () => {
  it('removes a new team and puts back a changed one when the filter itself cannot run', async () => {
    for (const failure of [new FilterError('unknownField', { field: 'probability' }), new GraphqlInputError('Run the filter: Invalid filter')]) {
      const created = setup(failure);
      const updated = setup(failure);

      expect((await created.check({ objectSingular: 'crmTeam', changes: [change('created')] })).refused.map((item) => item.recordId)).toEqual(['T']);
      expect((await updated.check({ objectSingular: 'crmTeam', changes: [change('updated')] })).problems).toEqual([]);
      expect(updated.putBacks).toEqual(['T']);
    }
  });

  it('keeps a new team and reports the failure when the search fails for another reason', async () => {
    const { check, putBacks } = setup(new Error('Run the filter: Internal server error'));
    const outcome = await check({ objectSingular: 'crmTeam', changes: [change('created')] });

    expect(outcome.refused).toEqual([]);
    expect(outcome.problems).toHaveLength(1);
    expect(putBacks).toEqual([]);
  });

  it('keeps a changed filter and reports the failure when the search fails for another reason', async () => {
    const { check, putBacks } = setup(new SyntaxError('Unexpected token < in JSON at position 0'));
    const outcome = await check({ objectSingular: 'crmTeamMember', changes: [change('updated')] });

    expect(outcome.problems).toHaveLength(1);
    expect(putBacks).toEqual([]);
  });
});
