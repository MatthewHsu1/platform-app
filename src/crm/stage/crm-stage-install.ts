import { WON_STATUS } from 'src/crm/crm-options.constant';
import {
  CRM_LEAD_OBJECT_UNIVERSAL_IDENTIFIER,
  CRM_RECURRING_PLAN_OBJECT_UNIVERSAL_IDENTIFIER,
  CRM_RECURRING_PLAN_SEED_KEYS,
  CRM_STAGE_OBJECT_UNIVERSAL_IDENTIFIER,
  CRM_STAGE_SEED_KEYS,
} from 'src/crm/crm-universal-identifiers.constant';
import { PIPELINE_CARD_FIELDS } from 'src/crm/lead/crm-lead-views.constant';
import { type ModuleInstallSpec } from 'src/shared/install/install-spec.type';

const stageSeed = (seedKey: string, name: string, sequence: number, color: string, isWon: boolean) => ({
  seedKey,
  values: { name, sequence, color, isWon, fold: false, rottingThresholdDays: 0 },
});

const planSeed = (seedKey: string, name: string, numberOfMonths: number) => ({
  seedKey,
  values: { name, numberOfMonths, sequence: 10, active: true },
});

// Stages and plans are made once, when the module first arrives; rows staff
// delete do not come back. The Language list starts with English (US).
// Names have no required rule: Twenty saves a new row before its name is
// typed, so such a rule refuses every new stage, plan and lead.
export const CRM_STAGE_INSTALL: ModuleInstallSpec = {
  firstVersion: '2.4.0',
  staffLists: [
    {
      objectUniversalIdentifier: CRM_LEAD_OBJECT_UNIVERSAL_IDENTIFIER,
      name: 'language',
      label: 'Language',
      icon: 'IconLanguage',
      type: 'SELECT',
      options: [{ value: 'EN_US', label: 'English (US)', color: 'gray', position: 0 }],
    },
  ],
  defaultRows: [],
  seedRows: [
    {
      objectUniversalIdentifier: CRM_STAGE_OBJECT_UNIVERSAL_IDENTIFIER,
      rows: [
        stageSeed(CRM_STAGE_SEED_KEYS.new, 'New', 1, 'gray', false),
        stageSeed(CRM_STAGE_SEED_KEYS.qualified, 'Qualified', 2, 'blue', false),
        stageSeed(CRM_STAGE_SEED_KEYS.proposition, 'Proposition', 3, 'purple', false),
        stageSeed(CRM_STAGE_SEED_KEYS.won, 'Won', 70, 'green', true),
      ],
    },
    {
      objectUniversalIdentifier: CRM_RECURRING_PLAN_OBJECT_UNIVERSAL_IDENTIFIER,
      rows: [
        planSeed(CRM_RECURRING_PLAN_SEED_KEYS.monthly, 'Monthly', 1),
        planSeed(CRM_RECURRING_PLAN_SEED_KEYS.yearly, 'Yearly', 12),
        planSeed(CRM_RECURRING_PLAN_SEED_KEYS.overThreeYears, 'Over 3 years', 36),
        planSeed(CRM_RECURRING_PLAN_SEED_KEYS.overFiveYears, 'Over 5 years', 60),
      ],
    },
  ],
  boards: [
    {
      objectUniversalIdentifier: CRM_LEAD_OBJECT_UNIVERSAL_IDENTIFIER,
      name: 'Pipeline',
      icon: 'IconLayoutKanban',
      groupByFieldName: 'stage',
      hideWhere: { fieldName: 'wonStatus', values: [WON_STATUS.LOST] },
      aggregate: { operation: 'SUM', fieldName: 'expectedRevenue' },
      // The stage columns are drawn by the stage board sync, as for every board of leads
      // grouped by stage.
      cardFields: PIPELINE_CARD_FIELDS,
    },
  ],
  validationRules: [
    {
      objectUniversalIdentifier: CRM_LEAD_OBJECT_UNIVERSAL_IDENTIFIER,
      name: 'platform-crm-lead-probability-range',
      expression: 'not isDefined(probability) or (probability >= 0 and probability <= 100)',
      message: 'The probability must be between 0 and 100.',
    },
  ],
  // Leads list by priority, highest first, then newest first.
  viewSorts: [
    {
      objectUniversalIdentifier: CRM_LEAD_OBJECT_UNIVERSAL_IDENTIFIER,
      viewName: 'All',
      sorts: [
        { fieldName: 'priority', direction: 'DESC' },
        { fieldName: 'createdAt', direction: 'DESC' },
      ],
    },
  ],
};
