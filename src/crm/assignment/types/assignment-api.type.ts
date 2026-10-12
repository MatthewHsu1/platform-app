import { type AssignmentMembership } from 'src/crm/assignment/types/assignment-membership.type';
import { type LeadRow } from 'src/crm/lead/types/lead-row.type';
import { type StageRow } from 'src/crm/lead/types/stage-row.type';
import { type TeamRow } from 'src/sales-team/team/types/team-row.type';

// Everything the assignment run reads and writes. The real one uses the app
// token; tests pass an in-memory one.
export type AssignmentApi = {
  now: () => Date;
  random: () => number;
  readTeams: (teamIds: string[]) => Promise<TeamRow[]>;
  readMemberships: (teamIds: string[]) => Promise<AssignmentMembership[]>;
  readStages: () => Promise<StageRow[]>;
  readDelayHours: () => Promise<number>;
  translateFilter: (text: string | null) => Promise<Record<string, unknown> | null>;
  findLeads: (filter: Record<string, unknown>) => Promise<LeadRow[]>;
  countLeadDays: (input: { teamIds: string[]; userIds: string[]; since: Date }) => Promise<Map<string, number>>;
  findDuplicateIds: (lead: LeadRow) => Promise<string[]>;
  writeTeam: (leadId: string, teamId: string) => Promise<boolean>;
  mergeLeads: (leadIds: string[]) => Promise<{ headId: string; tailIds: string[] }>;
  writeAssignment: (leadId: string, data: Record<string, unknown>) => Promise<boolean>;
  addTeamNote: (teamId: string, body: string) => Promise<void>;
  translateMessage: (message: string, values?: Record<string, string | number>) => string;
};
