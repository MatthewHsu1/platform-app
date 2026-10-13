import { describe, expect, it } from 'vitest';

import { planAssignmentMessages } from 'src/crm/assignment/utils/plan-assignment-messages.util';

const sales = { name: 'Sales', assignmentMax: 60 };

describe('planAssignmentMessages', () => {
  it('reports merged duplicates, allocated and assigned leads', () => {
    expect(planAssignmentMessages({ teams: [sales], allocated: 4, duplicates: 2, members: 2, membersAssigned: 3 })).toEqual([
      { message: '{count} duplicate leads were merged.', values: { count: 2 } },
      { message: '{count} leads were allocated to {team}.', values: { count: 4, team: 'Sales' } },
      { message: '{count} leads were assigned among {members} salespeople.', values: { count: 3, members: 2 } },
    ]);
  });

  it('explains a team with no capacity', () => {
    expect(
      planAssignmentMessages({ teams: [{ name: 'Sales', assignmentMax: 0 }], allocated: 0, duplicates: 0, members: 0, membersAssigned: 0 }),
    ).toEqual([
      { message: 'No lead was allocated to {team}: it has no capacity. Give its salespeople some capacity.', values: { team: 'Sales' } },
    ]);
  });

  it('explains a team whose filter matched nothing', () => {
    expect(planAssignmentMessages({ teams: [sales], allocated: 0, duplicates: 0, members: 0, membersAssigned: 0 })).toEqual([
      { message: 'No lead was allocated to {team} or its salespeople: no unassigned lead matches its filter.', values: { team: 'Sales' } },
    ]);
  });

  it('reports salespeople served from leads already on the team', () => {
    expect(planAssignmentMessages({ teams: [sales, { name: 'Web', assignmentMax: 30 }], allocated: 0, duplicates: 0, members: 3, membersAssigned: 2 })).toEqual([
      { message: 'No new lead was allocated to the teams: no lead matches their filters.' },
      { message: '{count} leads were assigned among {members} salespeople.', values: { count: 2, members: 3 } },
    ]);
  });

  it('reports leads allocated but given to nobody', () => {
    expect(planAssignmentMessages({ teams: [sales, { name: 'Web', assignmentMax: 30 }], allocated: 5, duplicates: 0, members: 2, membersAssigned: 0 })).toEqual([
      { message: '{count} leads were allocated among {teams} teams.', values: { count: 5, teams: 2 } },
      { message: 'No lead was assigned to a salesperson: no unassigned lead matches their filters.' },
    ]);
  });

  it('reports a run that did nothing over several teams', () => {
    expect(planAssignmentMessages({ teams: [sales, sales], allocated: 0, duplicates: 0, members: 0, membersAssigned: 0 })).toEqual([
      { message: 'No lead was allocated to any team or salesperson. Check the sales teams, their salespeople and the unassigned leads.' },
    ]);
  });
});
