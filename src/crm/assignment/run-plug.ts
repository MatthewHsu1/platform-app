import { ASSIGNMENT_MESSAGES } from 'src/crm/assignment/assignment-messages.constant';
import { buildAssignmentRequest } from 'src/crm/assignment/plug/utils/build-assignment-request.util';
import { planPlugWrites } from 'src/crm/assignment/plug/utils/plan-plug-writes.util';
import { readQuotas } from 'src/crm/assignment/read-quotas';
import { type AssignLeadsInput } from 'src/crm/assignment/types/assign-leads-input.type';
import { type AssignmentApi } from 'src/crm/assignment/types/assignment-api.type';
import { type AssignmentMembership } from 'src/crm/assignment/types/assignment-membership.type';
import { type AssignmentResult } from 'src/crm/assignment/types/assignment-result.type';
import { allocationCandidateFilter, assignableLeadFilter } from 'src/crm/assignment/utils/assignment-filters.util';
import { type StageRow } from 'src/crm/lead/types/stage-row.type';
import { type TeamRow } from 'src/sales-team/team/types/team-row.type';
import { describePlugFailure } from 'src/shared/plug/utils/describe-plug-failure.util';

// What the plug did, as the first lines of the run's report.
export const plugMessages = (api: AssignmentApi, result: AssignmentResult) => [
  ...(result.plugError === null
    ? []
    : [api.translateMessage(ASSIGNMENT_MESSAGES.plugFailed, { reason: describePlugFailure(result.plugError, api.translateMessage) })]),
  ...(result.plug === null ? [] : [api.translateMessage(ASSIGNMENT_MESSAGES.plugAssigned, { count: result.plug.written.length })]),
];

// When a plugin decides assignment, it is asked first. Returns the leads it
// answered for, which the team draw leaves out, and whether the built-in
// steps run. Its own assignments use no quota. A failure that skips the run
// counts as the run's error.
export const runPlug = async ({
  api,
  input,
  now,
  teams,
  memberships,
  stages,
  result,
}: {
  api: AssignmentApi;
  input: AssignLeadsInput;
  now: Date;
  teams: TeamRow[];
  memberships: AssignmentMembership[];
  stages: StageRow[];
  result: AssignmentResult;
}): Promise<{ runBuiltIn: boolean; answeredIds: ReadonlySet<string> }> => {
  const config = await api.readPlugConfig();

  if (config === null || !config.enabled) {
    return { runBuiltIn: true, answeredIds: new Set() };
  }
  const delayHours = await api.readDelayHours();
  const teamsWithMembers = teams.filter((team) => memberships.some((member) => member.teamId === team.id)).map((team) => team.id);
  const waitingForTeam = await api.findLeads(
    allocationCandidateFilter({ teamFilter: null, now, delayHours, creationDeltaDays: input.creationDeltaDays }),
  );
  const waitingForSalesperson = teamsWithMembers.length === 0 ? [] : await api.findLeads(assignableLeadFilter(teamsWithMembers));
  const leads = [...new Map([...waitingForTeam, ...waitingForSalesperson].map((lead) => [lead.id, lead])).values()];
  const { dayCounts, quotas } = await readQuotas(api, input, now, memberships);
  const call = await api.callAssignmentPlug(
    buildAssignmentRequest({ input, now, delayHours, teams, members: memberships, quotas, dayCounts, leads }),
  );

  if (call.kind === 'error') {
    result.plugError = call.failure;

    if (config.onError === 'SKIP') {
      result.errors.push(...plugMessages(api, result));
      return { runBuiltIn: false, answeredIds: new Set() };
    }
    return { runBuiltIn: true, answeredIds: new Set() };
  }
  const { writes, answeredIds } = planPlugWrites({ answer: call.payload, leads, stages, now: now.toISOString() });
  const written = await api.writePlugAssignments(writes);

  result.plug = { answered: answeredIds.length, written };
  return { runBuiltIn: config.leftOut !== 'UNTOUCHED', answeredIds: new Set(answeredIds) };
};
