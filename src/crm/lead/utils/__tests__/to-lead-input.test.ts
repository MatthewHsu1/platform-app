import { describe, expect, it } from 'vitest';

import { readLeadRow } from 'src/crm/lead/lead-selection';
import { changedLeadValues, toLeadInput } from 'src/crm/lead/utils/to-lead-input.util';

const LEAD = readLeadRow({
  id: 'l1',
  createdAt: '2026-10-09T10:00:00.000Z',
  probability: 40,
  stageId: 's1',
  expectedRevenue: { amountMicros: 1000000000, currencyCode: 'USD' },
});

describe('changedLeadValues', () => {
  it('keeps only the values that differ from the stored lead', () => {
    expect(
      changedLeadValues(LEAD, {
        probability: 40,
        stageId: 's2',
        expectedRevenue: { amountMicros: 1000000000, currencyCode: 'USD' },
      }),
    ).toEqual({ stageId: 's2' });
  });

  it('treats a missing value and an empty value as the same', () => {
    expect(changedLeadValues(LEAD, { dateClosed: null })).toEqual({});
  });
});

describe('toLeadInput', () => {
  it('drops fields nobody may write', () => {
    expect(toLeadInput({ id: 'l1', createdAt: 'x', updatedBy: null, stageId: 's2' })).toEqual({ stageId: 's2' });
  });

  it('sends money as whole micros', () => {
    expect(toLeadInput({ proratedRevenue: { amountMicros: 333300000.00000006, currencyCode: 'USD' } })).toEqual({
      proratedRevenue: { amountMicros: 333300000, currencyCode: 'USD' },
    });
  });
});
