import { describe, expect, it } from 'vitest';

import { snoozeRefusal } from 'src/stock/orderpoint/utils/snooze-refusal.util';

describe('snoozeRefusal', () => {
  it('refuses a new automatic rule that is snoozed', () => {
    expect(snoozeRefusal({ created: true, trigger: 'AUTO', snoozedUntil: '2025-09-03', snoozedUntilChanged: true })).toBe('createSnoozedAuto');
  });

  it('refuses snoozing an automatic rule', () => {
    expect(snoozeRefusal({ created: false, trigger: 'AUTO', snoozedUntil: '2025-09-03', snoozedUntilChanged: true })).toBe('snoozeAuto');
  });

  it('refuses clearing the snooze of an automatic rule', () => {
    expect(snoozeRefusal({ created: false, trigger: 'AUTO', snoozedUntil: null, snoozedUntilChanged: true })).toBe('snoozeAuto');
  });

  it('allows snoozing a manual rule and leaves other edits alone', () => {
    expect(snoozeRefusal({ created: false, trigger: 'MANUAL', snoozedUntil: '2025-09-03', snoozedUntilChanged: true })).toBeNull();
    expect(snoozeRefusal({ created: false, trigger: 'AUTO', snoozedUntil: '2025-09-03', snoozedUntilChanged: false })).toBeNull();
    expect(snoozeRefusal({ created: true, trigger: 'AUTO', snoozedUntil: null, snoozedUntilChanged: false })).toBeNull();
  });
});
