import { type AssignmentPlugAnswer } from 'src/crm/assignment/plug/types/assignment-plug-answer.type';
import { type AssignmentPlugRequest } from 'src/crm/assignment/plug/types/assignment-plug-request.type';
import { type AssignmentMembership } from 'src/crm/assignment/types/assignment-membership.type';
import { type AppLeadWrite } from 'src/crm/lead/types/app-lead-write.type';
import { type LeadRow } from 'src/crm/lead/types/lead-row.type';
import { type StageRow } from 'src/crm/lead/types/stage-row.type';
import { type TeamRow } from 'src/sales-team/team/types/team-row.type';
import { type PlugCallResult } from 'src/shared/plug/types/plug-call-result.type';
import { type PlugPointConfig } from 'src/shared/plug/types/plug-point-config.type';

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
  // Tags and language are read only when asked: the plug request sends them.
  findLeads: (filter: Record<string, unknown>, options?: { withTagsAndLanguage?: boolean }) => Promise<LeadRow[]>;
  countLeadDays: (input: { teamIds: string[]; userIds: string[]; since: Date }) => Promise<Map<string, number>>;
  findDuplicateIds: (lead: LeadRow) => Promise<string[]>;
  writeTeam: (leadId: string, teamId: string) => Promise<boolean>;
  mergeLeads: (leadIds: string[]) => Promise<{ headId: string; tailIds: string[] }>;
  writeAssignment: (leadId: string, data: Record<string, unknown>) => Promise<boolean>;
  addTeamNote: (teamId: string, body: string) => Promise<void>;
  translateMessage: (message: string, values?: Record<string, string | number>) => string;
  readPlugConfig: () => Promise<PlugPointConfig | null>;
  callAssignmentPlug: (request: AssignmentPlugRequest) => Promise<PlugCallResult<AssignmentPlugAnswer>>;
  writePlugAssignments: (writes: AppLeadWrite[]) => Promise<string[]>;
};
