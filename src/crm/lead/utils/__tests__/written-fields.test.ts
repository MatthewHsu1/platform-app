import { describe, expect, it } from 'vitest';

import { readLeadRow } from 'src/crm/lead/lead-selection';
import { writtenLeadFields, writtenOnCreate } from 'src/crm/lead/utils/written-fields.util';

describe('writtenLeadFields', () => {
  it('names a relation by its id column once, and drops names a lead does not have', () => {
    expect([...writtenLeadFields(['stage', 'stageId', 'probability', 'updatedAt', 'position'])].sort()).toEqual([
      'probability',
      'stageId',
    ]);
  });
});

describe('writtenOnCreate', () => {
  it('counts every field the new lead carries a value in', () => {
    const lead = readLeadRow({ id: 'l', createdAt: 'x', name: 'Deal', probability: 0, stageId: null });

    expect([...writtenOnCreate(lead)].sort()).toEqual(['name', 'probability']);
  });

  it('does not count the values the rules compute, which hold their defaults on a new lead', () => {
    const lead = readLeadRow({ id: 'l', createdAt: 'x', name: 'Deal', automatedProbability: 0, rottingDays: 0 });

    expect([...writtenOnCreate(lead)]).toEqual(['name']);
  });
});
