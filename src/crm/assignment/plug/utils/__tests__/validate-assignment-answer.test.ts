import { describe, expect, it } from 'vitest';

import { type AssignmentPlugRequest } from 'src/crm/assignment/plug/types/assignment-plug-request.type';
import { validateAssignmentAnswer } from 'src/crm/assignment/plug/utils/validate-assignment-answer.util';

const member = (id: string, teamId: string, workspaceMemberId: string, assignmentOptout = false) => ({
  id,
  teamId,
  workspaceMemberId,
  name: null,
  assignmentOptout,
  assignmentMax: 30,
  quota: 1,
  leadDayCount: 0,
  assignmentDomain: null,
  assignmentDomainPreferred: null,
});

const REQUEST = {
  run: { door: 'SCHEDULE', forceQuota: false, creationDeltaDays: 7, delayHours: 0, now: '2026-10-08T12:00:00.000Z' },
  teams: [{ id: 'T1' }, { id: 'T2' }],
  members: [member('m1', 'T1', 'u1'), member('m2', 'T2', 'u2'), member('m3', 'T1', 'u3', true)],
  leads: [{ id: 'l1' }, { id: 'l2' }],
} as unknown as AssignmentPlugRequest;

describe('validateAssignmentAnswer', () => {
  it("accepts team-only and salesperson assignments of the request's leads", () => {
    expect(
      validateAssignmentAnswer(
        {
          assignments: [
            { leadId: 'l1', teamId: 'T1', salespersonId: 'u1' },
            { leadId: 'l2', teamId: 'T2' },
          ],
        },
        REQUEST,
      ),
    ).toEqual({
      assignments: [
        { leadId: 'l1', teamId: 'T1', salespersonId: 'u1' },
        { leadId: 'l2', teamId: 'T2', salespersonId: null },
      ],
    });
  });

  it.each([
    [{}, 'The answer has no list of assignments.'],
    [{ assignments: ['l1'] }, 'Assignment 1 is not an object.'],
    [{ assignments: [{ leadId: 'l9', teamId: 'T1' }] }, 'Lead l9 was not in the request.'],
    [
      {
        assignments: [
          { leadId: 'l1', teamId: 'T1' },
          { leadId: 'l1', teamId: 'T2' },
        ],
      },
      'Lead l1 is assigned twice.',
    ],
    [{ assignments: [{ leadId: 'l1', teamId: 'T9' }] }, 'Team T9 was not in the request.'],
    [{ assignments: [{ leadId: 'l1', teamId: 'T1', salespersonId: 'u2' }] }, 'Salesperson u2 is not a member of team T1 who takes leads.'],
    [{ assignments: [{ leadId: 'l1', teamId: 'T1', salespersonId: 'u3' }] }, 'Salesperson u3 is not a member of team T1 who takes leads.'],
  ])('refuses the whole answer %j', (answer, problem) => {
    expect(() => validateAssignmentAnswer(answer, REQUEST)).toThrow(problem);
  });

  it('refuses the whole answer when only its last assignment is wrong', () => {
    expect(() =>
      validateAssignmentAnswer(
        {
          assignments: [
            { leadId: 'l1', teamId: 'T1' },
            { leadId: 'l2', teamId: 'T9' },
          ],
        },
        REQUEST,
      ),
    ).toThrow('Team T9 was not in the request.');
  });
});
