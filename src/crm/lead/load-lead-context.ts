import { type LeadContext } from 'src/crm/lead/types/lead-context.type';
import { type LeadRow } from 'src/crm/lead/types/lead-row.type';
import { type PartnerCompanyRow } from 'src/crm/lead/types/partner-company-row.type';
import { type PartnerPersonRow } from 'src/crm/lead/types/partner-person-row.type';
import { sortStages } from 'src/crm/stage/utils/sort-stages.util';
import { TEAM_CONTEXT_FINDS, toTeamContext } from 'src/sales-team/load-team-context';
import { type TeamContextLists } from 'src/sales-team/types/team-context-lists.type';
import { findMany, records } from 'src/shared/triggers/records';

type StageNode = {
  id: string;
  name: string | null;
  sequence: number | null;
  isWon: boolean | null;
  fold: boolean | null;
  rottingThresholdDays: number | null;
  createdAt: string;
};

const presentIds = (values: (string | null)[]) => [...new Set(values.filter((value): value is string => value !== null))];

const COMPANY_SELECTION =
  'id name domainName { primaryLinkUrl primaryLinkLabel secondaryLinks } address { addressStreet1 addressStreet2 addressCity addressPostcode addressState addressCountry }';
const companyRecords = records('company', 'companies');

// One request for everything the lead rules read besides the leads. Stages,
// plans and teams are few; contacts and customers only those of these leads.
// A contact's own company, when the lead has another or none, is read after:
// the company name comes from there when the lead has no customer company.
export const loadLeadContext = async (leads: LeadRow[]): Promise<LeadContext> => {
  const { stages, plans, people, companies, ...teamLists } = await findMany<
    {
      stages: StageNode[];
      plans: { id: string; numberOfMonths: number | null }[];
      people: PartnerPersonRow[];
      companies: PartnerCompanyRow[];
    } & TeamContextLists
  >({
    ...TEAM_CONTEXT_FINDS,
    stages: {
      of: records('crmStage', 'crmStages'),
      filter: {},
      selection: 'id name sequence isWon fold rottingThresholdDays createdAt',
    },
    plans: { of: records('crmRecurringPlan', 'crmRecurringPlans'), filter: {}, selection: 'id numberOfMonths' },
    people: {
      of: records('person', 'people'),
      filter: { id: { in: presentIds(leads.map((lead) => lead.personId)) } },
      selection:
        'id name { firstName lastName } emails { primaryEmail additionalEmails } phones { primaryPhoneNumber primaryPhoneCountryCode primaryPhoneCallingCode additionalPhones } jobTitle companyId address { addressStreet1 addressStreet2 addressCity addressPostcode addressState addressCountry }',
    },
    companies: {
      of: companyRecords,
      filter: { id: { in: presentIds(leads.map((lead) => lead.companyId)) } },
      selection: COMPANY_SELECTION,
    },
  });
  const knownCompanyIds = new Set(companies.map((company) => company.id));
  const contactCompanies = await companyRecords.find<PartnerCompanyRow>(
    { id: { in: presentIds(people.map((person) => person.companyId)).filter((id) => !knownCompanyIds.has(id)) } },
    COMPANY_SELECTION,
  );
  const { teams, memberships, stageTeamIds } = toTeamContext(teamLists);

  return {
    stages: sortStages(
      stages.map((stage) => ({
        id: stage.id,
        name: stage.name ?? '',
        sequence: stage.sequence ?? 0,
        isWon: stage.isWon === true,
        fold: stage.fold === true,
        rottingThresholdDays: stage.rottingThresholdDays ?? 0,
        createdAt: stage.createdAt,
        teamIds: stageTeamIds.get(stage.id) ?? [],
      })),
    ),
    recurringPlanMonths: new Map(plans.map((plan) => [plan.id, plan.numberOfMonths ?? 0])),
    teams,
    memberships,
    people: new Map(people.map((person) => [person.id, person])),
    companies: new Map([...companies, ...contactCompanies].map((company) => [company.id, company])),
  };
};
