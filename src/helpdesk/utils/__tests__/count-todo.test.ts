import { describe, expect, it } from 'vitest';

import { countTodo } from 'src/helpdesk/utils/count-todo.util';

const open = { teamId: 'teamA', unattended: true, stageClosed: false, active: true, priority: 'MEDIUM' };

describe('countTodo', () => {
  const cases = [
    { ...open, assignedUserId: null, priority: 'VERY_HIGH' },
    { ...open, assignedUserId: 'userOwn' },
    { ...open, assignedUserId: 'userTeam' },
    { ...open, teamId: 'teamB', assignedUserId: null },
    { ...open, assignedUserId: null, active: false },
  ];

  it('counts the open, unassigned, unattended and very high priority cases of a team', () => {
    expect(countTodo(cases, 'teamA')).toEqual({
      todoTicketCount: 3, todoTicketCountUnassigned: 1, todoTicketCountUnattended: 3, todoTicketCountHighPriority: 1,
    });
  });

  it('stops counting a case once it reaches a closed stage', () => {
    const [first, ...rest] = cases;
    const moved = [{ ...first, stageClosed: true, unattended: false }, ...rest];

    expect(countTodo(moved, 'teamA')).toEqual({
      todoTicketCount: 2, todoTicketCountUnassigned: 0, todoTicketCountUnattended: 2, todoTicketCountHighPriority: 0,
    });
  });

  it('counts a case without a stage as open', () => {
    expect(countTodo([{ ...open, unattended: false, assignedUserId: 'x' }], 'teamA').todoTicketCount).toBe(1);
  });
});
