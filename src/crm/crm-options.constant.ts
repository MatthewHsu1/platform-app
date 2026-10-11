// Select values of crmLead that code compares against, so they are fixed in
// the app (lead type, won status, priority); labels may change.
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

// Stage is a staff list: the install hook makes it with these defaults and staff own it afterwards. Mark Won moves a
// lead to WON only while staff keep that option.
export const STAGE_FIELD_NAME = 'stage';
export const WON_STAGE_VALUE = 'WON';

// Priority order for merges and for sorting: the higher rank wins.
export const PRIORITY_RANK: Record<string, number> = {
  [PRIORITY.LOW]: 0,
  [PRIORITY.MEDIUM]: 1,
  [PRIORITY.HIGH]: 2,
  [PRIORITY.VERY_HIGH]: 3,
};

// Phone and email quality, written by the app from the lead's phone and email.
export const PHONE_STATE = {
  CORRECT: 'CORRECT',
  INCORRECT: 'INCORRECT',
} as const;

export const EMAIL_STATE = {
  CORRECT: 'CORRECT',
  INCORRECT: 'INCORRECT',
} as const;
