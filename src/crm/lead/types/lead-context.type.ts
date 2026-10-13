import { type LeadRow } from 'src/crm/lead/types/lead-row.type';
import { type PartnerCompanyRow } from 'src/crm/lead/types/partner-company-row.type';
import { type PartnerPersonRow } from 'src/crm/lead/types/partner-person-row.type';
import { type StageRow } from 'src/crm/lead/types/stage-row.type';
import { type PlsFieldKey } from 'src/crm/scoring/types/pls-field-key.type';
import { type MembershipRow } from 'src/sales-team/team/types/membership-row.type';
import { type TeamRow } from 'src/sales-team/team/types/team-row.type';

// Everything the lead rules read besides the lead itself, loaded once per batch.
export type LeadContext = {
  stages: StageRow[];
  recurringPlanMonths: ReadonlyMap<string, number>;
  teams: TeamRow[];
  memberships: MembershipRow[];
  people: ReadonlyMap<string, PartnerPersonRow>;
  companies: ReadonlyMap<string, PartnerCompanyRow>;
  score?: (lead: LeadRow) => number | null;
  // The lead fields the score reads besides the stage; a change to one of them rescores the lead.
  scoringFields?: readonly PlsFieldKey[];
};
