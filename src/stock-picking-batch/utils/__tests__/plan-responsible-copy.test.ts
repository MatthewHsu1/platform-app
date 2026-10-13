import { describe, expect, it } from 'vitest';

import { planResponsibleCopy, shouldCopyBatchResponsible } from 'src/stock-picking-batch/utils/plan-responsible-copy.util';

describe('planResponsibleCopy', () => {
  it('a responsible set on the batch goes to every transfer that has another one', () => {
    expect(
      planResponsibleCopy({
        responsibleId: 'me',
        pickings: [
          { id: 'p1', responsibleUserId: null },
          { id: 'p2', responsibleUserId: 'me' },
        ],
      }),
    ).toEqual(['p1']);
  });

  it('a cleared responsible is cleared on the transfers', () => {
    expect(
      planResponsibleCopy({
        responsibleId: null,
        pickings: [
          { id: 'p1', responsibleUserId: 'me' },
          { id: 'p2', responsibleUserId: null },
        ],
      }),
    ).toEqual(['p1']);
  });

  it('a wave responsible goes to a transfer that joined whole, not to one split off for the wave after the wave was saved', () => {
    expect(
      planResponsibleCopy({
        responsibleId: 'wave-user',
        createdBefore: '2026-10-10T10:00:00.000Z',
        pickings: [
          { id: 'whole', responsibleUserId: 'someone', createdAt: '2026-10-09T08:00:00.000Z' },
          { id: 'split', responsibleUserId: 'clicking-user', createdAt: '2026-10-10T10:00:01.000Z' },
        ],
      }),
    ).toEqual(['whole']);
  });
});

describe('shouldCopyBatchResponsible', () => {
  const created = { created: true, responsibleSaved: false, responsibleId: null, pickingTypeId: 'out', name: 'BATCH/OUT/00001', nameRead: 'BATCH/OUT/00001' };

  it('a new batch with its number hands out its empty responsible, also on a rerun after the number was written', () => {
    expect(shouldCopyBatchResponsible(created)).toBe(true);
  });

  it('a new batch with a responsible hands it out, typed or not', () => {
    expect(shouldCopyBatchResponsible({ ...created, responsibleId: 'me', pickingTypeId: null, name: 'New', nameRead: 'New' })).toBe(true);
  });

  it('a new batch with neither a type nor a responsible hands out nothing', () => {
    expect(shouldCopyBatchResponsible({ ...created, pickingTypeId: null, name: 'New', nameRead: 'New' })).toBe(false);
  });

  it('a later save hands it out when staff change the responsible or the batch gets a new number', () => {
    const later = { ...created, created: false };

    expect(shouldCopyBatchResponsible(later)).toBe(false);
    expect(shouldCopyBatchResponsible({ ...later, responsibleSaved: true })).toBe(true);
    expect(shouldCopyBatchResponsible({ ...later, name: 'BATCH/INT/00002' })).toBe(true);
  });
});
