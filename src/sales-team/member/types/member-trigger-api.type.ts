import { type CrmSettings } from 'src/crm/settings/types/crm-settings.type';
import { type MemberCandidate } from 'src/sales-team/member/types/member-candidate.type';
import { type AssignmentFilterChange } from 'src/sales-team/types/assignment-filter-change.type';
import { type FilterCheckOutcome } from 'src/sales-team/types/filter-check-outcome.type';

export type MemberTriggerApi = {
  membershipsOfUsers: (userIds: string[]) => Promise<MemberCandidate[]>;
  userNames: (userIds: string[]) => Promise<Map<string, string | null>>;
  destroyMembers: (memberIds: string[]) => Promise<void>;
  softDeleteMember: (memberId: string) => Promise<void>;
  putBackMember: (memberId: string, data: Record<string, unknown>) => Promise<void>;
  noteOnTeam: (teamId: string, reason: string) => Promise<void>;
  archiveMembers: (memberIds: string[]) => Promise<void>;
  renameMember: (memberId: string, name: string | null) => Promise<void>;
  readSettings: () => Promise<Pick<CrmSettings, 'membershipMulti'>>;
  recomputeCapacity: (teamIds: string[]) => Promise<void>;
  checkAssignmentFilters: (changes: AssignmentFilterChange[]) => Promise<FilterCheckOutcome>;
  memberLocale: (workspaceMemberId: string | undefined) => Promise<string>;
  translate: (locale: string | null, message: string, values?: Record<string, string>) => string;
};
