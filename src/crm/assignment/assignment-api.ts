import { ASSIGNMENT_MESSAGES } from 'src/crm/assignment/assignment-messages.constant';
import { LEAD_FILTER_CATALOGUE } from 'src/crm/assignment/lead-filter-catalogue';
import { lookupOneHop } from 'src/crm/assignment/lookup-one-hop';
import { CRM_ASSIGNMENT_PLUG_POINT } from 'src/crm/assignment/plug/assignment-plug.constant';
import { validateAssignmentAnswer } from 'src/crm/assignment/plug/utils/validate-assignment-answer.util';
import { type AssignmentApi } from 'src/crm/assignment/types/assignment-api.type';
import { leadDayCountFilter } from 'src/crm/assignment/utils/assignment-filters.util';
import { loadLeadContext } from 'src/crm/lead/load-lead-context';
import { findLeadDuplicates } from 'src/crm/lead/merge/find-lead-duplicates';
import { mergeLeads } from 'src/crm/lead/merge/merge-leads';
import { queryLeads } from 'src/crm/lead/query-leads';
import { writeLeadsAsApplication } from 'src/crm/lead/write-leads-as-application';
import { readCrmSettings } from 'src/crm/settings/read-crm-settings';
import { MEMBER_SELECTION, TEAM_CONTEXT_FINDS, toMembershipRows, toTeamContext } from 'src/sales-team/load-team-context';
import { type TeamContextLists } from 'src/sales-team/types/team-context-lists.type';
import { toTwentyFilter } from 'src/shared/filter-editor/to-twenty-filter';
import { translate } from 'src/shared/i18n/translate';
import { callPlugPoint } from 'src/shared/plug/call-plug-point';
import { readPlugConfig } from 'src/shared/plug/read-plug-config';
import { addNote } from 'src/shared/triggers/put-back';
import { records } from 'src/shared/triggers/records';

type MemberNode = TeamContextLists['memberRows'][number] & { name: string | null };

const teamRecords = records('crmTeam', 'crmTeams');
const memberRecords = records('crmTeamMember', 'crmTeamMembers');
const leadRecords = records('crmLead', 'crmLeads');

// The assignment run reads and writes with the app token: it sees every lead,
// whoever started it.
export const makeAssignmentApi = (locale: string): AssignmentApi => ({
  now: () => new Date(),
  random: Math.random,
  readTeams: async (teamIds) =>
    toTeamContext({
      teamRows: await teamRecords.find<TeamContextLists['teamRows'][number]>({ id: { in: teamIds } }, TEAM_CONTEXT_FINDS.teamRows.selection),
      memberRows: [],
      stageTeamRows: [],
    }).teams,
  readMemberships: async (teamIds) => {
    const rows = await memberRecords.find<MemberNode>(
      { and: [{ crmTeamId: { in: teamIds } }, { active: { eq: true } }] },
      `${MEMBER_SELECTION} name`,
    );
    const nameOf = new Map(rows.map((row) => [row.id, row.name]));

    return toMembershipRows(rows).map((member) => ({ ...member, name: nameOf.get(member.id) ?? null }));
  },
  readStages: async () => (await loadLeadContext([])).stages,
  readDelayHours: async () => (await readCrmSettings()).assignmentDelayHours,
  translateFilter: (text) => toTwentyFilter(text, LEAD_FILTER_CATALOGUE, lookupOneHop('application')),
  findLeads: (filter) => queryLeads('application', filter),
  countLeadDays: async (input) => {
    const counts = new Map<string, number>();
    const found = await leadRecords.find<{ id: string; teamId: string | null; salespersonId: string | null }>(
      leadDayCountFilter(input),
      'id teamId salespersonId',
    );

    for (const lead of found) {
      const key = `${lead.salespersonId}|${lead.teamId}`;

      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return counts;
  },
  findDuplicateIds: async (lead) =>
    (
      await findLeadDuplicates({
        email: lead.emailFrom?.primaryEmail ?? null,
        personId: null,
        companyId: null,
        includeLost: false,
        caller: 'application',
      })
    ).map((duplicate) => duplicate.id),
  writeTeam: async (leadId, teamId) => {
    const { written } = await writeLeadsAsApplication([
      { leadId, data: { teamId }, guard: { teamId: { is: 'NULL' }, salespersonId: { is: 'NULL' } } },
    ]);

    return written.includes(leadId);
  },
  mergeLeads: (leadIds) => mergeLeads(leadIds, { maxLength: 0, caller: 'application' }),
  writeAssignment: async (leadId, data) => {
    const { written } = await writeLeadsAsApplication([{ leadId, data, guard: { salespersonId: { is: 'NULL' } } }]);

    return written.includes(leadId);
  },
  addTeamNote: (teamId, body) =>
    addNote({ objectSingular: 'crmTeam', recordId: teamId, title: translate(locale, ASSIGNMENT_MESSAGES.noteTitle), body }),
  translateMessage: (message, values) => translate(locale, message, values),
  readPlugConfig: () => readPlugConfig(CRM_ASSIGNMENT_PLUG_POINT),
  callAssignmentPlug: (request) => callPlugPoint(CRM_ASSIGNMENT_PLUG_POINT, request, validateAssignmentAnswer),
  writePlugAssignments: async (writes) => (writes.length === 0 ? [] : (await writeLeadsAsApplication(writes)).written),
});
