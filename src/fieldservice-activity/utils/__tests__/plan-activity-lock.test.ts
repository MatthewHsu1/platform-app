import { describe, expect, it } from 'vitest';

import { type ActivityLockFields } from 'src/fieldservice-activity/types/activity-lock-fields.type';
import { planActivityLock } from 'src/fieldservice-activity/utils/plan-activity-lock.util';

const settled: ActivityLockFields = { name: 'Check the belt', required: true, ref: 'R1', state: 'DONE' };

describe('planActivityLock', () => {
  it('puts back the name a person changed on a completed activity', () => {
    expect(planActivityLock({ before: settled, current: { ...settled, name: 'Changed' }, written: ['name'], staffSave: true })).toEqual({
      name: 'Check the belt',
    });
  });

  it('puts back every locked field a person changed on a cancelled activity', () => {
    const before = { ...settled, state: 'CANCEL' };

    expect(
      planActivityLock({ before, current: { ...before, required: false, ref: null }, written: ['required', 'ref'], staffSave: true }),
    ).toEqual({ required: true, ref: 'R1' });
  });

  it('leaves an activity that is still to do alone', () => {
    const before = { ...settled, state: 'TODO' };

    expect(planActivityLock({ before, current: { ...before, name: 'Changed' }, written: ['name'], staffSave: true })).toBeNull();
  });

  it('leaves the buttons and other app writes alone', () => {
    expect(planActivityLock({ before: settled, current: { ...settled, name: 'Changed' }, written: ['name'], staffSave: false })).toBeNull();
  });

  it('writes nothing for a field that already has its old value, so a second pass finds nothing to do', () => {
    expect(planActivityLock({ before: settled, current: settled, written: ['name'], staffSave: true })).toBeNull();
  });

  it('ignores a save that wrote only other fields', () => {
    expect(planActivityLock({ before: settled, current: { ...settled, name: 'Changed' }, written: ['sequence'], staffSave: true })).toBeNull();
  });
});
