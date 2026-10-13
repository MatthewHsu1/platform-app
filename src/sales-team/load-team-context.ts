import { type MembershipRow } from 'src/sales-team/team/types/membership-row.type';
import { type TeamRow } from 'src/sales-team/team/types/team-row.type';
import { type TeamContextLists } from 'src/sales-team/types/team-context-lists.type';
import { type FindSpec, findMany, records } from 'src/shared/triggers/records';

export const MEMBER_SELECTION =
  'id crmTeamId salesUserId active assignmentMax assignmentOptout assignmentDomain assignmentDomainPreferred createdAt';

// Every team (archived ones too: a lead may sit in one), the active
// memberships, and the teams each stage is limited to.
export const TEAM_CONTEXT_FINDS: { [TKey in keyof TeamContextLists]: FindSpec } = {
  teamRows: {
    of: records('crmTeam', 'crmTeams'),
    filter: {},
    selection: 'id name sequence createdAt active leaderId useLeads useOpportunities assignmentOptout assignmentMax assignmentDomain color seedKey',
  },
  memberRows: { of: records('crmTeamMember', 'crmTeamMembers'), filter: { active: { eq: true } }, selection: MEMBER_SELECTION },
  stageTeamRows: { of: records('crmStageTeam', 'crmStageTeams'), filter: {}, selection: 'stageId teamId' },
};

export const toMembershipRows = (rows: TeamContextLists['memberRows']): MembershipRow[] =>
  rows.flatMap(({ crmTeamId, salesUserId, ...row }) =>
    crmTeamId === null || salesUserId === null
      ? []
      : [
          {
            ...row,
            teamId: crmTeamId,
            userId: salesUserId,
            active: row.active === true,
            assignmentMax: row.assignmentMax ?? 0,
            assignmentOptout: row.assignmentOptout === true,
          },
        ],
  );

export const toTeamContext = ({ teamRows, memberRows, stageTeamRows }: TeamContextLists) => {
  const stageTeamIds = new Map<string, string[]>();

  for (const { stageId, teamId } of stageTeamRows) {
    if (stageId !== null && teamId !== null) {
      stageTeamIds.set(stageId, [...(stageTeamIds.get(stageId) ?? []), teamId]);
    }
  }

  const teams: TeamRow[] = teamRows.map((team) => ({
    ...team,
    sequence: team.sequence ?? 0,
    active: team.active !== false,
    useLeads: team.useLeads === true,
    useOpportunities: team.useOpportunities === true,
    assignmentOptout: team.assignmentOptout === true,
    assignmentMax: team.assignmentMax ?? 0,
  }));

  return { teams, memberships: toMembershipRows(memberRows), stageTeamIds };
};

export const loadTeamContext = async () => toTeamContext(await findMany<TeamContextLists>(TEAM_CONTEXT_FINDS));
