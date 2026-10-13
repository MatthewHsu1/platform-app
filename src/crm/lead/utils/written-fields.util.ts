import { type LeadRow } from 'src/crm/lead/types/lead-row.type';

const RELATIONS = ['stage', 'team', 'salesperson', 'person', 'company', 'lostReason', 'recurringPlan', 'source', 'medium', 'campaign'];

// Values the rules compute; staff cannot type them, so on a new lead they hold the field defaults.
const COMPUTED_FIELDS = new Set<string>([
  'automatedProbability',
  'proratedRevenue',
  'recurringRevenueMonthly',
  'recurringRevenueMonthlyProrated',
  'recurringRevenueProrated',
  'dateOpen',
  'dateLastStageUpdate',
  'dayOpen',
  'dayClose',
  'phoneState',
  'emailState',
  'isRotting',
  'rottingDays',
]);

const LEAD_FIELDS = new Set<string>([
  'name',
  'leadType',
  'wonStatus',
  'priority',
  'stageId',
  'teamId',
  'salespersonId',
  'personId',
  'companyId',
  'lostReasonId',
  'recurringPlanId',
  'sourceId',
  'mediumId',
  'campaignId',
  'probability',
  'expectedRevenue',
  'recurringRevenue',
  'dateClosed',
  'dateConversion',
  'dateDeadline',
  'emailFrom',
  'phone',
  'website',
  'contactAddress',
  'contactName',
  'partnerName',
  'jobPosition',
  'referred',
  'description',
  'tags',
  'language',
  ...COMPUTED_FIELDS,
]);

// A save lists a relation under its name and its id column; the rules use the id column.
export const writtenLeadFields = (updatedFields: string[]) =>
  new Set(
    updatedFields
      .map((field) => (RELATIONS.includes(field) ? `${field}Id` : field))
      .filter((field) => LEAD_FIELDS.has(field)),
  );

// A create lists no fields; every field given a value counts as written.
export const writtenOnCreate = (after: LeadRow) =>
  new Set(
    Object.entries(after)
      .filter(([field, value]) => LEAD_FIELDS.has(field) && !COMPUTED_FIELDS.has(field) && value !== null)
      .map(([field]) => field),
  );
