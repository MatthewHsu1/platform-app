import { type TeamRow } from 'src/sales-team/team/types/team-row.type';

type TeamNode = Omit<TeamRow, 'sequence' | 'active' | 'useLeads' | 'useOpportunities' | 'assignmentOptout' | 'assignmentMax'> & {
  sequence: number | null;
  active: boolean | null;
  useLeads: boolean | null;
  useOpportunities: boolean | null;
  assignmentOptout: boolean | null;
  assignmentMax: number | null;
};

type MemberNode = {
  id: string;
  crmTeamId: string | null;
  salesUserId: string | null;
  active: boolean | null;
  assignmentMax: number | null;
  assignmentOptout: boolean | null;
  assignmentDomain: string | null;
  assignmentDomainPreferred: string | null;
  createdAt: string;
};

// The team lists as one request reads them.
export type TeamContextLists = {
  teamRows: TeamNode[];
  memberRows: MemberNode[];
  stageTeamRows: { stageId: string | null; teamId: string | null }[];
};
