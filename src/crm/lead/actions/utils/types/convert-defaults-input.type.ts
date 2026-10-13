import { type LeadRow } from 'src/crm/lead/types/lead-row.type';
import { type PartnerPersonRow } from 'src/crm/lead/types/partner-person-row.type';
import { type MembershipRow } from 'src/sales-team/team/types/membership-row.type';
import { type TeamRow } from 'src/sales-team/team/types/team-row.type';

// `undefined` in the request = not touched in the dialog yet.
export type ConvertDefaultsInput = {
  lead: LeadRow;
  leadPerson: PartnerPersonRow | null;
  personByEmail: PartnerPersonRow | null;
  chosenPerson: PartnerPersonRow | null;
  request: {
    customerAction?: 'CREATE' | 'EXIST';
    personId?: string | null;
    companyId?: string | null;
    salespersonId?: string | null;
    teamId?: string | null;
  };
  teams: TeamRow[];
  memberships: MembershipRow[];
};
