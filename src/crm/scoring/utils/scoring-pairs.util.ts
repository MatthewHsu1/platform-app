import { type LeadRow } from 'src/crm/lead/types/lead-row.type';
import { EMPTY_QUALITY_VALUE, PLS_FIELD_KEYS, SCORING_VARIABLE } from 'src/crm/scoring/scoring-variables.constant';
import { type PlsFieldKey } from 'src/crm/scoring/types/pls-field-key.type';

const isPlsFieldKey = (value: unknown): value is PlsFieldKey =>
  typeof value === 'string' && (PLS_FIELD_KEYS as readonly string[]).includes(value);

// A stored list may hold keys an older version allowed; only known ones count.
export const safeScoringFields = (raw: unknown): PlsFieldKey[] => (Array.isArray(raw) ? raw.filter(isPlsFieldKey) : []);

export const isScoringStartDate = (text: string | null): text is string => {
  if (text === null || !/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return false;
  }
  const parsed = new Date(`${text}T00:00:00.000Z`);

  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(text);
};

// The start date is a day: a lead created at any time on that day counts.
export const isCreatedOnOrAfter = (createdAt: string, startDate: string) => createdAt.slice(0, 10) >= startDate;

const fieldValue = (lead: LeadRow, key: Exclude<PlsFieldKey, 'tags'>): string | null => {
  switch (key) {
    case 'phoneState':
      return lead.phoneState ?? EMPTY_QUALITY_VALUE;
    case 'emailState':
      return lead.emailState ?? EMPTY_QUALITY_VALUE;
    case 'state':
      return lead.contactAddress?.addressState ?? null;
    case 'country':
      return lead.contactAddress?.addressCountry ?? null;
    case 'source':
      return lead.sourceId;
    case 'language':
      return lead.language;
  }
};

// The (variable, value) pairs a lead counts under. Empty values are skipped,
// except the two quality fields, whose empty value is a value of its own.
export const scoringPairs = (lead: LeadRow, fields: readonly PlsFieldKey[]): [string, string][] => {
  const pairs: [string, string][] = [];

  if (lead.stageId !== null) {
    pairs.push([SCORING_VARIABLE.stage, lead.stageId]);
  }
  for (const key of fields) {
    if (key === 'tags') {
      continue;
    }
    const value = fieldValue(lead, key);

    if (value !== null && value !== '') {
      pairs.push([SCORING_VARIABLE[key], value]);
    }
  }
  if (fields.includes('tags')) {
    for (const tag of lead.tags ?? []) {
      pairs.push([SCORING_VARIABLE.tag, tag]);
    }
  }

  return pairs;
};
