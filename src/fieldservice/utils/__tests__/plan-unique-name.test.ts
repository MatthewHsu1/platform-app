import { describe, expect, it } from 'vitest';

import { planUniqueName } from 'src/fieldservice/utils/plan-unique-name.util';

describe('planUniqueName', () => {
  it('refuses a second field service team with the same name', () => {
    expect(planUniqueName({ name: 'North', beforeName: 'Night shift', isCreate: false, otherNames: ['Default Team', 'North'] })).toEqual({
      kind: 'putBack',
      name: 'Night shift',
    });
  });

  it('refuses a second equipment with the same name, clearing it on a new row', () => {
    expect(planUniqueName({ name: 'Treadmill T8', beforeName: null, isCreate: true, otherNames: ['Treadmill T8'] })).toEqual({
      kind: 'putBack',
      name: null,
    });
  });

  it('never counts a blank name as a duplicate', () => {
    expect(planUniqueName({ name: null, beforeName: null, isCreate: true, otherNames: [null, ''] })).toEqual({ kind: 'keep' });
    expect(planUniqueName({ name: '  ', beforeName: 'A', isCreate: false, otherNames: ['  '] })).toEqual({ kind: 'keep' });
  });

  it('keeps a name no other row holds', () => {
    expect(planUniqueName({ name: 'South', beforeName: 'North', isCreate: false, otherNames: ['North shop'] })).toEqual({ kind: 'keep' });
  });
});
