export const CRM_LEAD_OBJECT_UNIVERSAL_IDENTIFIER =
  'e13ac7ef-6469-4ae0-b6a8-4d29bc30c7ba';

export const CRM_LEAD_FIELD_UNIVERSAL_IDENTIFIERS = {
  leadType: '042b72ae-1a87-4d53-bd6f-52c21a4a220d',
  wonStatus: '2c393ece-2ed0-4897-905f-b8ccd2f5b65f',
  lostReason: '247bb932-9d09-46bc-9cee-7ccaf727d21a',
  priority: 'ccbe392a-9b94-442f-9aff-cbebab776265',
  salesperson: '47ced9b1-f5a8-4e88-ac08-a7464646198d',
  person: '514c1cbb-b284-4ca3-afb4-d9c2703ddbdb',
  company: '16605ddc-b609-4b84-b4e3-0c6442b6d187',
  contactName: '5a8056e2-f0c0-49b7-b220-0ca83d937d36',
  partnerName: '6223c165-1a53-4ee1-a82e-3c549ca30630',
  jobPosition: '75287358-80ad-463c-a9c8-7b84fc34a36a',
  emailFrom: 'd3bcbc52-5048-42b8-8f03-de4ac7bfab53',
  phone: 'b1e2a7a8-c279-43c6-9f54-a244905a1f67',
  website: '1dde32ab-d0e1-4b50-b01f-c732faa53337',
  contactAddress: '3a80be12-1bf3-45cd-8b13-da1a4f5c4b1e',
  expectedRevenue: '8588e950-15a8-43e8-8fbf-437df7250761',
  probability: '90dd4f59-cb80-4244-b7bb-e6237c726aa3',
  dateDeadline: 'cfdc9610-6041-403f-8210-848bedc2c262',
  dateClosed: '75cb1438-0268-4232-9ce3-646c3ee8188f',
  dateConversion: 'f3034086-374c-4f7d-a7cf-c3ec0e8ec7d6',
  description: '07daea7e-bbe6-44ff-b96b-d52c91319ead',
  referred: 'a9517eb9-af54-4536-821f-aa467c051614',
  source: '18614832-c586-4f8f-9bb7-37d667cb586a',
  medium: 'a34ea3be-350a-4b96-92b4-00d9f7e98547',
  campaign: 'e318eeef-3ab4-43de-bacb-d03b7f275faf',
  stage: 'e80c1376-7dfe-4b48-9dce-a376864a2a19',
  recurringRevenue: '575acd4a-3e82-44e4-8b8a-c66b2460d703',
  recurringPlan: '902724c7-3417-4906-8d97-3251f611ebb8',
  automatedProbability: '4ebf2972-e423-41bd-b6a4-fcff4d35498b',
  proratedRevenue: 'fd1630d0-650b-46ab-acea-231e95d2928d',
  recurringRevenueMonthly: '8369bc6e-2368-489a-98dc-ac49bda9cc59',
  recurringRevenueMonthlyProrated: 'd3d2aba2-759c-487a-be2a-1377ef058715',
  recurringRevenueProrated: 'afae8dc2-e47c-4240-81e1-33b2a8c43c38',
  dateOpen: '8e7169e2-b067-4ba5-96f0-429d4efe4127',
  dayOpen: '85e92b12-de9b-43aa-8452-fa82a7e0053d',
  dayClose: '3d35de09-fb98-4918-b88a-06a0e25dca03',
  dateLastStageUpdate: 'a065b51a-fc29-451b-bcb8-dda0acdf11fa',
  phoneState: 'c7bb5782-b022-4330-a1c1-4dffc4e4f9ac',
  emailState: '5e719f0b-dfc6-4e85-8eb0-df0234c683d0',
  isRotting: '88641d59-61df-462a-adaa-487f0bf4aef1',
  rottingDays: 'fcf953bf-4222-431c-978b-359dccf042b7',
} as const;

// The other side of each lead relation, on the standard objects
export const PERSON_CRM_LEADS_FIELD_UNIVERSAL_IDENTIFIER =
  '80bec41d-f32b-46a5-95f7-37395ed348c4';
export const COMPANY_CRM_LEADS_FIELD_UNIVERSAL_IDENTIFIER =
  '27c7cd76-ee62-4fec-ad64-34701771fd66';
export const WORKSPACE_MEMBER_CRM_LEADS_FIELD_UNIVERSAL_IDENTIFIER =
  '5085de79-cf36-4303-bb1f-8795dc0e3ecf';

export const CRM_LOST_REASON_OBJECT_UNIVERSAL_IDENTIFIER =
  '79321ffe-a11a-4446-a79d-d2341b1973fa';
export const CRM_LOST_REASON_FIELD_UNIVERSAL_IDENTIFIERS = {
  active: '42f9a328-f757-44bf-be5f-002d6311ce7d',
  crmLeads: 'a9a2311b-acdc-49cf-9d5d-a3faec32cba9',
} as const;

export const CRM_FOLDER_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER =
  '352018e9-7656-4c45-9cf6-b37e2c252f53';
export const CRM_LEADS_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER =
  '65d66f3a-99af-4cc9-b7ab-728122bd3eba';
export const CRM_LOST_REASONS_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER =
  '9248274a-e6a3-4b6d-a60c-0630f0c60c45';

export const CRM_STAGE_OBJECT_UNIVERSAL_IDENTIFIER =
  '6c6f2157-59b9-4472-9cd2-5b8e07afc15d';
export const CRM_STAGE_FIELD_UNIVERSAL_IDENTIFIERS = {
  name: '04667f6e-966c-4e99-a589-243ccccfdf7e',
  sequence: '87f286ef-96cd-4562-a0c5-e745c56e67d0',
  isWon: '0f3efe29-9b34-43d4-8b11-e95fa941d760',
  rottingThresholdDays: 'f945f5ff-d32f-4b00-8908-3315681d90e5',
  requirements: 'db75a152-3949-46af-9513-a7d8c65aab2b',
  fold: '6088a0f2-b2cc-4206-837b-0d813190515f',
  color: '5fada11b-e6cc-4c68-8c68-49045829e1ba',
  crmLeads: '6420838e-013b-4e5a-951d-2c0362beeb4b',
  seedKey: '8df343c1-4312-41f1-b609-50640a4da732',
  teams: 'd12c77fd-ca8d-4f97-83c2-b9fd6d0d04c7',
} as const;
export const CRM_STAGES_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER =
  'bfcb0abb-9e04-41d5-ab76-171237f35029';
export const CRM_STAGE_TRIGGER_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER =
  '50d8133d-7672-48b9-995a-7626f0ef7c45';

export const CRM_RECURRING_PLAN_OBJECT_UNIVERSAL_IDENTIFIER =
  '803d5933-e978-4f42-8719-5412fbe129d5';
export const CRM_RECURRING_PLAN_FIELD_UNIVERSAL_IDENTIFIERS = {
  name: '973ddc43-9a9b-4db8-b1c9-80f73149b08e',
  numberOfMonths: '7b198a7d-dbfe-4b02-810c-2eeaac7672cc',
  active: '9c4c822a-974e-4f5e-9918-01db9acfde54',
  sequence: '1569f382-44ed-4132-b9da-0929f721a036',
  crmLeads: 'e0c33e93-662d-41fb-b7d4-9cc6ef1c08fb',
  seedKey: '8ae05e7a-80af-4618-a6d8-e446ecccaa05',
} as const;
export const CRM_RECURRING_PLANS_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER =
  'c7dac6f3-d932-4cfc-a815-e2916374e3b9';
export const CRM_RECURRING_PLAN_TRIGGER_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER =
  '35203025-af8b-4680-bbe7-e14dc66d79bd';

export const CRM_LEAD_TRIGGER_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER =
  '81056677-8e81-413b-8783-a90047696b17';
export const CRM_LOST_REASON_TRIGGER_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER =
  '1a2a8ce2-a7d3-4069-987f-75f23190b886';

// Rows the install step makes once; code finds them by key after staff rename them.
export const CRM_STAGE_SEED_KEYS = {
  new: 'crm.stage_lead1',
  qualified: 'crm.stage_lead2',
  proposition: 'crm.stage_lead3',
  won: 'crm.stage_lead4',
} as const;

export const CRM_RECURRING_PLAN_SEED_KEYS = {
  monthly: 'crm.crm_recurring_plan_monthly',
  yearly: 'crm.crm_recurring_plan_yearly',
  overThreeYears: 'crm.crm_recurring_plan_over_3_years',
  overFiveYears: 'crm.crm_recurring_plan_over_5_years',
} as const;
