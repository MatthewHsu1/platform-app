import { type LeadRow } from 'src/crm/lead/types/lead-row.type';
import { type PlsFieldKey } from 'src/crm/scoring/types/pls-field-key.type';
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

// The rows of the worked example: one team, five closed leads (two won in New,
// two lost in New, one lost in Proposition), every email correct.
export const TOOLTIP_ROWS = [
  row('team', 'stage', 'new', 2.1, 3.1),
  row('team', 'stage', 'qualified', 2.1, 1.1),
  row('team', 'stage', 'proposition', 2.1, 1.1),
  row('team', 'stage', 'won', 2.1, 0.1),
  row('team', 'country', 'c0', 1.1, 1.1),
  row('team', 'country', 'c1', 1.1, 0.1),
  row('team', 'state', 's0', 2.1, 0.1),
  row('team', 'state', 's1', 0.1, 1.1),
  row('team', 'emailState', 'CORRECT', 2.1, 3.1),
  row('team', 'phoneState', 'CORRECT', 2.1, 1.1),
  row('team', 'phoneState', 'INCORRECT', 0.1, 2.1),
  row('team', 'source', 'src1', 1.1, 0.1),
  row('team', 'source', 'src0', 0.1, 2.1),
];
export const TOOLTIP_FIELDS: PlsFieldKey[] = ['country', 'state', 'emailState', 'phoneState', 'source'];
export const TOOLTIP_LEAD = lead({
  id: 'x',
  teamId: 'team',
  stageId: 'qualified',
  country: 'c0',
  state: 's0',
  sourceId: 'src0',
  phoneState: 'CORRECT',
  emailState: 'CORRECT',
});
