import { ASSIGNMENT_MESSAGES } from 'src/crm/assignment/assignment-messages.constant';
import { readQuotas } from 'src/crm/assignment/read-quotas';
import { plugMessages, runPlug } from 'src/crm/assignment/run-plug';
import { type AssignLeadsInput } from 'src/crm/assignment/types/assign-leads-input.type';
import { type AssignmentApi } from 'src/crm/assignment/types/assignment-api.type';
import { type AssignmentMembership } from 'src/crm/assignment/types/assignment-membership.type';
import { type AssignmentResult } from 'src/crm/assignment/types/assignment-result.type';
import { type TeamAllocation } from 'src/crm/assignment/types/team-allocation.type';
import { runAllocationLoop } from 'src/crm/assignment/utils/allocation-loop.util';
import { allocationCandidateFilter, assignableLeadFilter, withinIds } from 'src/crm/assignment/utils/assignment-filters.util';
import { runAssignmentLoops } from 'src/crm/assignment/utils/assignment-loops.util';
import { planMemberOrder } from 'src/crm/assignment/utils/member-order.util';
import { planAssignmentMessages } from 'src/crm/assignment/utils/plan-assignment-messages.util';
import { planAssignmentWrite } from 'src/crm/assignment/utils/plan-assignment-write.util';
import { sortAllocationCandidates, sortAssignableLeads } from 'src/crm/assignment/utils/sort-assignment-leads.util';
import { type LeadRow } from 'src/crm/lead/types/lead-row.type';
import { type StageRow } from 'src/crm/lead/types/stage-row.type';
import { type TeamRow } from 'src/sales-team/team/types/team-row.type';
import { sortTeams } from 'src/sales-team/team/utils/sort-teams.util';
import { storedFilterHasConditions } from 'src/shared/filter-editor/stored-filter';
import { isFilterRefusal } from 'src/shared/filter-editor/is-filter-refusal';
import { translateFilterError } from 'src/shared/filter-editor/translate-filter-error';

const ID_CHUNK = 100;

// Ends the run: its message is the run's whole report.
class AssignmentStop extends Error {}

// A filter that cannot run stops the whole run, so it is fixed at once: the
// filter cannot be translated, or Twenty refuses the search it makes. Any
// other error fails the run as it is.
const usingFilter = async <TResult>(api: AssignmentApi, describe: (reason: string) => string, work: () => Promise<TResult>) => {
  try {
    return await work();
  } catch (error) {
    if (!isFilterRefusal(error)) {
      throw error;
    }
    throw new AssignmentStop(describe(translateFilterError(error, api.translateMessage)));
  }
};

const emptyResult = (teams: TeamRow[]): AssignmentResult => ({
  teams: Object.fromEntries(teams.map((team) => [team.id, { assigned: [], merged: [], duplicates: [] }])),
  members: {},
  errors: [],
  messages: [],
  plugError: null,
  plug: null,
});

const teamName = (team: TeamRow) => team.name ?? team.id;

// The ids among `leadIds` that match a filter, read 100 at a time.
const matchIds = async (api: AssignmentApi, filter: Record<string, unknown>, leadIds: string[]) => {
  const matched: string[] = [];

  for (let start = 0; start < leadIds.length; start += ID_CHUNK) {
    const found = await api.findLeads(withinIds(filter, leadIds.slice(start, start + ID_CHUNK)));

    matched.push(...found.map((lead) => lead.id));
  }
  return matched;
};

// The leads of a duplicate group still there: one may have been deleted since
// the duplicates were looked up.
const stillThere = async (api: AssignmentApi, leadIds: string[]) => {
  const found = new Set((await api.findLeads(withinIds(null, leadIds))).map((lead) => lead.id));

  return leadIds.filter((id) => found.has(id));
};

// Puts unassigned leads on teams, one weighted draw per lead, and merges a
// lead with its duplicates on the way. Every team filter is used before the
// first lead moves. Leads a plugin already answered for are left out.
const allocateLeads = async ({
  api,
  input,
  now,
  teams,
  result,
  excludedLeadIds,
}: {
  api: AssignmentApi;
  input: AssignLeadsInput;
  now: Date;
  teams: TeamRow[];
  result: AssignmentResult;
  excludedLeadIds: ReadonlySet<string>;
}) => {
  const delayHours = await api.readDelayHours();
  const allocations: TeamAllocation[] = [];
  const candidates = new Map<string, LeadRow>();

  for (const team of teams) {
    if (team.assignmentMax <= 0) {
      continue;
    }
    const describe = (reason: string) => api.translateMessage(ASSIGNMENT_MESSAGES.teamFilterStopped, { team: teamName(team), reason });
    const teamFilter = await usingFilter(api, describe, () => api.translateFilter(team.assignmentDomain));
    const candidateFilter = allocationCandidateFilter({ teamFilter, now, delayHours, creationDeltaDays: input.creationDeltaDays });
    const found =
      teamFilter === null ? await api.findLeads(candidateFilter) : await usingFilter(api, describe, () => api.findLeads(candidateFilter));
    const leads = sortAllocationCandidates(found.filter((lead) => !excludedLeadIds.has(lead.id)));

    leads.forEach((lead) => candidates.set(lead.id, lead));
    allocations.push({ teamId: team.id, weight: team.assignmentMax, leadIds: leads.map((lead) => lead.id) });
  }
  // Duplicates are found once, before any lead moves. The draws are made
  // first and the teams written after, in one request per team: a lead
  // another writer gave a team or a salesperson meanwhile is then neither
  // counted nor merged, and its duplicates wait for the next run.
  const duplicatesOf = await api.findDuplicateIds([...candidates.values()]);
  const { allocations: drawn } = await runAllocationLoop({
    teams: allocations,
    random: api.random,
    allocate: async (_teamId, leadId) => ({ done: [leadId, ...(duplicatesOf.get(leadId) ?? [])] }),
  });
  const written = new Set(await api.writeTeams(drawn.map(({ teamId, leadId }) => ({ leadId, teamId }))));
  const removed = new Set<string>();

  for (const { teamId, leadId } of drawn) {
    const teamResult = result.teams[teamId];
    const known = (duplicatesOf.get(leadId) ?? []).filter((id) => !removed.has(id));

    if (!written.has(leadId)) {
      continue;
    }
    const group = known.length <= 1 ? known : await stillThere(api, known);

    if (group.length <= 1) {
      teamResult.assigned.push(leadId);
      continue;
    }
    const { headId, tailIds } = await api.mergeLeads(group);

    tailIds.forEach((id) => removed.add(id));
    teamResult.merged.push(headId);
    teamResult.duplicates.push(...tailIds);
  }
};

// Which of the team's leads each member's filters take. A member with a
// preferred filter also gets the leads matching both filters.
const memberLeadSets = async (api: AssignmentApi, team: TeamRow, members: AssignmentMembership[], leadIds: string[]) => {
  const eligible = new Map<string, ReadonlySet<string>>();
  const preferred = new Map<string, ReadonlySet<string>>();

  for (const member of members) {
    const describe = (reason: string) =>
      api.translateMessage(ASSIGNMENT_MESSAGES.memberFilterStopped, { member: member.name ?? member.userId, team: teamName(team), reason });
    const matching = async (filter: Record<string, unknown> | null) =>
      new Set(filter === null ? leadIds : await usingFilter(api, describe, () => matchIds(api, filter, leadIds)));
    const memberFilter = await usingFilter(api, describe, () => api.translateFilter(member.assignmentDomain));

    if (storedFilterHasConditions(member.assignmentDomainPreferred)) {
      const preferredFilter = await usingFilter(api, describe, () => api.translateFilter(member.assignmentDomainPreferred));

      preferred.set(
        member.id,
        await matching(
          memberFilter === null ? preferredFilter : preferredFilter === null ? memberFilter : { and: [memberFilter, preferredFilter] },
        ),
      );
    }
    eligible.set(member.id, await matching(memberFilter));
  }
  return { eligible, preferred };
};

// Hands each team's unassigned leads to its salespeople, round robin within
// their daily quotas, and turns them into opportunities.
const assignToMembers = async ({
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
}) => {
  const teamsWithMembers = teams.filter((team) => memberships.some((member) => member.teamId === team.id));

  if (teamsWithMembers.length === 0) {
    return;
  }
  const teamIds = teamsWithMembers.map((team) => team.id);
  const members = memberships.filter((member) => teamIds.includes(member.teamId));
  const { quotas } = await readQuotas(api, input, now, members);
  const leads = sortAssignableLeads(await api.findLeads(assignableLeadFilter(teamIds)));

  for (const team of teamsWithMembers) {
    const teamLeads = leads.filter((lead) => lead.teamId === team.id);

    if (teamLeads.length === 0) {
      continue;
    }
    const ordered = planMemberOrder(
      members.filter((member) => member.teamId === team.id).map((member) => ({ ...member, membershipId: member.id })),
      quotas,
      api.random,
    );

    if (ordered.length === 0) {
      continue;
    }
    ordered.forEach((member) => {
      result.members[member.id] = { assigned: [], quota: quotas.get(member.id) ?? 0 };
    });
    const { eligible, preferred } = await memberLeadSets(
      api,
      team,
      ordered,
      teamLeads.map((lead) => lead.id),
    );
    const leadById = new Map(teamLeads.map((lead) => [lead.id, lead]));
    const userOf = new Map(ordered.map((member) => [member.id, member.userId]));
    const taken = new Set<string>();
    const quotaLeft = new Map(quotas);

    // The loops are planned in memory and the plan written in one request per
    // set of values. A lead another writer took meanwhile costs no quota: the
    // loops run again over the leads still free with the quota still left.
    for (;;) {
      const planned: { leadId: string; membershipId: string }[] = [];

      await runAssignmentLoops({
        leads: teamLeads.filter((lead) => !taken.has(lead.id)).map((lead) => ({ id: lead.id, probability: lead.probability })),
        members: ordered.map((member) => member.id).filter((id) => (quotaLeft.get(id) ?? 0) > 0),
        quotas: quotaLeft,
        eligible,
        preferred,
        assign: async (leadId, membershipId) => {
          planned.push({ leadId, membershipId });
          return true;
        },
      });
      if (planned.length === 0) {
        break;
      }
      const written = new Set(
        await api.writeAssignments(
          planned.map(({ leadId, membershipId }) => ({
            leadId,
            data: planAssignmentWrite({
              lead: leadById.get(leadId) as LeadRow,
              salespersonId: userOf.get(membershipId) as string,
              stages,
              now: now.toISOString(),
            }),
          })),
        ),
      );

      for (const { leadId, membershipId } of planned) {
        taken.add(leadId);
        if (written.has(leadId)) {
          result.members[membershipId].assigned.push(leadId);
          quotaLeft.set(membershipId, (quotaLeft.get(membershipId) ?? 0) - 1);
        }
      }
      if (written.size === planned.length) {
        break;
      }
    }
  }
};

// The totals as messages; a manual run also notes them on its teams. When
// the built-in steps did not run, only the plug's lines are reported.
const report = async (api: AssignmentApi, input: AssignLeadsInput, teams: TeamRow[], result: AssignmentResult, builtIn: boolean) => {
  const teamResults = Object.values(result.teams);
  const memberResults = Object.values(result.members);
  const messages = builtIn
    ? planAssignmentMessages({
        teams: teams.map((team) => ({ name: teamName(team), assignmentMax: team.assignmentMax })),
        allocated: teamResults.reduce((total, team) => total + team.assigned.length + team.merged.length, 0),
        duplicates: teamResults.reduce((total, team) => total + team.duplicates.length, 0),
        members: memberResults.length,
        membersAssigned: memberResults.reduce((total, member) => total + member.assigned.length, 0),
      })
    : [];

  result.messages = [...plugMessages(api, result), ...messages.map((message) => api.translateMessage(message.message, message.values))];

  if (input.door === 'SCHEDULE') {
    return;
  }
  const body = [api.translateMessage(ASSIGNMENT_MESSAGES.requestedBy, { name: input.requestedBy ?? '' }), ...result.messages].join(
    '\n\n',
  );

  // The leads are written by now: a note that fails is reported, not a failed run.
  for (const team of teams) {
    try {
      await api.addTeamNote(team.id, body);
    } catch (error) {
      result.messages.push(
        api.translateMessage(ASSIGNMENT_MESSAGES.noteFailed, { team: teamName(team), reason: error instanceof Error ? error.message : String(error) }),
      );
    }
  }
};

export const makeAssignLeads =
  (api: AssignmentApi) =>
  async (input: AssignLeadsInput): Promise<AssignmentResult> => {
    const now = api.now();
    const teams = sortTeams(await api.readTeams(input.teamIds));
    const memberships = await api.readMemberships(teams.map((team) => team.id));
    const stages = await api.readStages();
    const result = emptyResult(teams);

    let builtIn = false;

    try {
      const plug = await runPlug({ api, input, now, teams, memberships, stages, result });

      builtIn = plug.runBuiltIn;
      if (builtIn) {
        await allocateLeads({ api, input, now, teams, result, excludedLeadIds: plug.answeredIds });
        await assignToMembers({ api, input, now, teams, memberships, stages, result });
      }
    } catch (error) {
      if (!(error instanceof AssignmentStop)) {
        throw error;
      }
      // The plug's own assignments stay written: its lines stay in the report.
      result.errors.push(error.message);
      result.messages = [...plugMessages(api, result), ...result.errors];
      return result;
    }
    await report(api, input, teams, result, builtIn);
    return result;
  };
