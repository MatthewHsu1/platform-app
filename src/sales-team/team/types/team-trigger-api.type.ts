import { type AssignmentFilterChange } from 'src/sales-team/types/assignment-filter-change.type';
import { type FilterCheckOutcome } from 'src/sales-team/types/filter-check-outcome.type';

export type TeamTriggerApi = {
  pickColor: () => string;
  setColor: (teamId: string, color: string) => Promise<void>;
  stillDeletedTeams: (teamIds: string[]) => Promise<{ id: string; seedKey: string | null }[]>;
  teamIdsOnStages: (teamIds: string[]) => Promise<Set<string>>;
  restoreTeam: (teamId: string, reason: string) => Promise<void>;
  foldTeamScoring: (teamIds: string[]) => Promise<void>;
  deleteMembersOf: (teamIds: string[]) => Promise<void>;
  clearTeamOnLeads: (teamIds: string[]) => Promise<void>;
  destroyStageLinksOf: (teamIds: string[]) => Promise<void>;
  destroyMembersOf: (teamIds: string[]) => Promise<void>;
  destroyTeams: (teamIds: string[]) => Promise<void>;
  checkAssignmentFilters: (changes: AssignmentFilterChange[]) => Promise<FilterCheckOutcome>;
  memberLocale: (workspaceMemberId: string | undefined) => Promise<string>;
  translate: (locale: string | null, message: string) => string;
};
