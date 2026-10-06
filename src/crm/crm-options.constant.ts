// Select values of crmLead that code compares against, so they are fixed in
// the app; labels may change.
export const LEAD_TYPE = {
  LEAD: 'LEAD',
  OPPORTUNITY: 'OPPORTUNITY',
} as const;

export const WON_STATUS = {
  PENDING: 'PENDING',
  WON: 'WON',
  LOST: 'LOST',
} as const;

export const PRIORITY = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  VERY_HIGH: 'VERY_HIGH',
} as const;

export type LeadType = (typeof LEAD_TYPE)[keyof typeof LEAD_TYPE];
export type WonStatus = (typeof WON_STATUS)[keyof typeof WON_STATUS];

// Stage is a staff list: the install hook makes it with these defaults (the reference
// crm/data/crm_stage_data.xml) and staff own it afterwards. Mark Won moves a
// lead to WON only while staff keep that option.
export const STAGE_FIELD_NAME = 'stage';
export const WON_STAGE_VALUE = 'WON';
