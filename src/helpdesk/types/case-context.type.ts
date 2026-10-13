import { type CaseMembershipRow } from 'src/helpdesk/types/case-membership-row.type';
import { type CaseStageRow } from 'src/helpdesk/types/case-stage-row.type';
import { type CaseTeamRow } from 'src/helpdesk/types/case-team-row.type';
import { type HelpdeskSettings } from 'src/helpdesk/types/helpdesk-settings.type';

export type CaseContext = {
  // Every stage and team not in the trash, archived ones included.
  stages: CaseStageRow[];
  teams: CaseTeamRow[];
  memberships: CaseMembershipRow[];
  // Person id to company id, for the people the batch names.
  personCompanies: ReadonlyMap<string, string | null>;
  settings: HelpdeskSettings;
};
