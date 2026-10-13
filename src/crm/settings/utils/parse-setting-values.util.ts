import { PLS_FIELD_KEYS } from 'src/crm/scoring/scoring-variables.constant';
import { type PlsFieldKey } from 'src/crm/scoring/types/pls-field-key.type';
import { isScoringStartDate, safeScoringFields } from 'src/crm/scoring/utils/scoring-pairs.util';

const asList = (raw: string): unknown => {
  if (raw.trim().startsWith('[')) {
    try {
      return JSON.parse(raw) as unknown;
    } catch {
      return [];
    }
  }

  return raw
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part !== '');
};

// A variable reaches a logic function as a value or as text, depending on how
// it is read; both forms give the same list.
export const parsePlsFields = (raw: unknown): PlsFieldKey[] => {
  if (raw === undefined || raw === null) {
    return [...PLS_FIELD_KEYS];
  }

  return safeScoringFields(typeof raw === 'string' ? asList(raw) : raw);
};

export const parseDateSetting = (raw: unknown): string | null => {
  if (typeof raw !== 'string') {
    return null;
  }
  const day = raw.slice(0, 10);

  return isScoringStartDate(day) ? day : null;
};
