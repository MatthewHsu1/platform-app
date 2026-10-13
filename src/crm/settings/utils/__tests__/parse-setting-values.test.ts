import { describe, expect, it } from 'vitest';

import { parseDateSetting, parsePlsFields } from 'src/crm/settings/utils/parse-setting-values.util';

describe('parsePlsFields', () => {
  it('reads a list, a JSON list or a comma list, and keeps only known fields', () => {
    expect(parsePlsFields(['country', 'tags'])).toEqual(['country', 'tags']);
    expect(parsePlsFields('["country","nope"]')).toEqual(['country']);
    expect(parsePlsFields('country,state')).toEqual(['country', 'state']);
  });

  it('uses every field when the setting was never stored, and none when it is empty', () => {
    expect(parsePlsFields(undefined)).toEqual(['phoneState', 'emailState', 'state', 'country', 'source', 'language', 'tags']);
    expect(parsePlsFields('')).toEqual([]);
    expect(parsePlsFields([])).toEqual([]);
  });
});

describe('parseDateSetting', () => {
  it('keeps a calendar date and drops anything else', () => {
    expect(parseDateSetting('2026-10-01')).toBe('2026-10-01');
    expect(parseDateSetting('2026-10-01T00:00:00.000Z')).toBe('2026-10-01');
    expect(parseDateSetting('soon')).toBeNull();
    expect(parseDateSetting(null)).toBeNull();
  });
});
