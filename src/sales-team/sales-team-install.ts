import { type ModuleInstallSpec } from 'src/shared/install/install-spec.type';
import {
  CRM_STAGE_TEAM_OBJECT_UNIVERSAL_IDENTIFIER,
  CRM_TEAM_MEMBER_OBJECT_UNIVERSAL_IDENTIFIER,
  CRM_TEAM_OBJECT_UNIVERSAL_IDENTIFIER,
  SALES_TEAM_SEED_KEYS,
} from 'src/sales-team/sales-team-universal-identifiers.constant';

// The install payload names no user, so "Sales" starts with no leader and no
// member. Website and Point of Sale start archived; their delete is refused.
// The team name has no required rule: Twenty saves a new row before its name
// is typed, so such a rule refuses every new team.
export const SALES_TEAM_INSTALL: ModuleInstallSpec = {
  firstVersion: '2.4.0',
  staffLists: [],
  defaultRows: [],
  seedRows: [
    {
      objectUniversalIdentifier: CRM_TEAM_OBJECT_UNIVERSAL_IDENTIFIER,
      rows: [
        { seedKey: SALES_TEAM_SEED_KEYS.sales, values: { name: 'Sales', sequence: 0, active: true, useLeads: false, useOpportunities: true } },
        { seedKey: SALES_TEAM_SEED_KEYS.website, values: { name: 'Website', sequence: 10, active: false, useLeads: false, useOpportunities: false } },
        {
          seedKey: SALES_TEAM_SEED_KEYS.pointOfSale,
          values: { name: 'Point of Sale', sequence: 10, active: false, useLeads: false, useOpportunities: false },
        },
      ],
    },
  ],
  boards: [],
  validationRules: [
    {
      objectUniversalIdentifier: CRM_TEAM_MEMBER_OBJECT_UNIVERSAL_IDENTIFIER,
      name: 'platform-crm-team-member-team-and-user',
      expression: 'isDefined(crmTeam) and isDefined(user)',
      message: 'A team member needs a sales team and a salesperson.',
    },
    {
      objectUniversalIdentifier: CRM_STAGE_TEAM_OBJECT_UNIVERSAL_IDENTIFIER,
      name: 'platform-crm-stage-team-both-sides',
      expression: 'isDefined(stage) and isDefined(team)',
      message: 'A stage team link needs a stage and a sales team.',
    },
  ],
};
