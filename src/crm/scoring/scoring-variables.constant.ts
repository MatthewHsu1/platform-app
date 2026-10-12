import { type PlsFieldKey } from 'src/crm/scoring/types/pls-field-key.type';

// The optional lead fields the score may use, in the default order. Stage is
// always used and the sales team splits the counts, so neither is listed.
export const PLS_FIELD_KEYS: readonly PlsFieldKey[] = [
  'phoneState',
  'emailState',
  'state',
  'country',
  'source',
  'language',
  'tags',
];

// The variable name a value is stored under; every tag is its own `tag` value.
export const SCORING_VARIABLE = {
  stage: 'stage',
  phoneState: 'phoneState',
  emailState: 'emailState',
  state: 'state',
  country: 'country',
  source: 'source',
  language: 'language',
  tag: 'tag',
} as const;

// An empty phone or email quality still counts, under this value.
export const EMPTY_QUALITY_VALUE = 'False';

// A tag seen on fewer won and lost leads than this is left out of the score,
// so a rare tag cannot swing it.
export const TAG_MIN_COUNT = 50;

export const SCORING_ROW_SELECTION = 'id variable value wonCount lostCount teamId createdAt';
