import { type LeadRow } from 'src/crm/lead/types/lead-row.type';
import { type StageRow } from 'src/crm/lead/types/stage-row.type';
import { type ScoringRow } from 'src/crm/scoring/types/scoring-row.type';

export const STAGES: StageRow[] = [
  { id: 'new', name: 'New', sequence: 1, isWon: false, fold: false, rottingThresholdDays: 0, createdAt: '2026-01-01T00:00:00.000Z', teamIds: [] },
  { id: 'qualified', name: 'Qualified', sequence: 2, isWon: false, fold: false, rottingThresholdDays: 0, createdAt: '2026-01-01T00:00:01.000Z', teamIds: [] },
  { id: 'proposition', name: 'Proposition', sequence: 3, isWon: false, fold: false, rottingThresholdDays: 0, createdAt: '2026-01-01T00:00:02.000Z', teamIds: [] },
  { id: 'won', name: 'Won', sequence: 70, isWon: true, fold: false, rottingThresholdDays: 0, createdAt: '2026-01-01T00:00:03.000Z', teamIds: [] },
];

const BLANK: LeadRow = {
  id: '',
  createdAt: '2026-02-01T00:00:00.000Z',
  deletedAt: null,
  name: null,
  leadType: 'OPPORTUNITY',
  wonStatus: 'PENDING',
  priority: 'LOW',
  stageId: null,
  teamId: null,
  salespersonId: null,
  personId: null,
  companyId: null,
  lostReasonId: null,
  recurringPlanId: null,
  sourceId: null,
  mediumId: null,
  campaignId: null,
  probability: null,
  automatedProbability: 0,
  expectedRevenue: null,
  recurringRevenue: null,
  proratedRevenue: null,
  recurringRevenueMonthly: null,
  recurringRevenueMonthlyProrated: null,
  recurringRevenueProrated: null,
  dateOpen: null,
  dateClosed: null,
  dateConversion: null,
  dateLastStageUpdate: null,
  dateDeadline: null,
  dayOpen: null,
  dayClose: null,
  emailFrom: null,
  phone: null,
  website: null,
  contactAddress: null,
  contactName: null,
  partnerName: null,
  jobPosition: null,
  referred: null,
  description: null,
  tags: null,
  language: null,
  phoneState: null,
  emailState: null,
  isRotting: false,
  rottingDays: 0,
  createdBy: null,
  updatedBy: null,
};

export const lead = (values: Partial<LeadRow> & { country?: string | null; state?: string | null }): LeadRow => {
  const { country = null, state = null, ...rest } = values;

  return {
    ...BLANK,
    ...rest,
    contactAddress:
      country === null && state === null
        ? (rest.contactAddress ?? null)
        : {
            addressStreet1: null,
            addressStreet2: null,
            addressCity: null,
            addressPostcode: null,
            addressState: state,
            addressCountry: country,
          },
  };
};

let rowNumber = 0;

export const row = (teamId: string | null, variable: string, value: string, wonCount: number, lostCount: number): ScoringRow => {
  rowNumber += 1;

  return {
    id: `row-${rowNumber}`,
    variable,
    value,
    wonCount,
    lostCount,
    teamId,
    createdAt: new Date(Date.UTC(2026, 0, 1, 0, 0, rowNumber)).toISOString(),
  };
};
