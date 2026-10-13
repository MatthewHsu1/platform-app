import { describe, expect, it } from 'vitest';

import { type PickingForCheck } from 'src/stock-picking-batch/types/picking-for-check.type';
import { incompatiblePickings } from 'src/stock-picking-batch/utils/allowed-pickings.util';

const picking = (name: string, state: string, pickingTypeId: string | null = 'out'): PickingForCheck => ({
  id: name,
  name,
  state,
  pickingTypeId,
});

describe('incompatiblePickings', () => {
  it('a batch in progress takes waiting, confirmed and ready transfers of its type', () => {
    expect(
      incompatiblePickings({ name: 'BATCH/OUT/1', state: 'IN_PROGRESS', pickingTypeId: 'out' }, [
        picking('A', 'WAITING'),
        picking('B', 'CONFIRMED'),
        picking('C', 'ASSIGNED'),
      ]),
    ).toEqual([]);
  });

  it('refuses drafts unless the batch is a draft, and done or cancelled transfers always', () => {
    const batch = { name: 'BATCH/OUT/1', state: 'IN_PROGRESS' as const, pickingTypeId: 'out' };

    expect(incompatiblePickings(batch, [picking('D', 'DRAFT'), picking('E', 'DONE'), picking('F', 'CANCEL')])).toEqual([
      'D',
      'E',
      'F',
    ]);
    expect(incompatiblePickings({ ...batch, state: 'DRAFT' }, [picking('D', 'DRAFT')])).toEqual([]);
  });

  it('refuses another operation type, unless the batch has none', () => {
    expect(incompatiblePickings({ name: 'B', state: 'DRAFT', pickingTypeId: 'out' }, [picking('G', 'ASSIGNED', 'in')])).toEqual([
      'G',
    ]);
    expect(incompatiblePickings({ name: 'B', state: 'DRAFT', pickingTypeId: null }, [picking('G', 'ASSIGNED', 'in')])).toEqual([]);
  });
});
