import { type ObjectRecordEvent } from 'twenty-sdk/define';
import { describe, expect, it } from 'vitest';

import { errorCollector } from 'src/shared/triggers/retry-on-conflict';
import { makeHandlePickingTypeDeletes } from 'src/stock/picking-type/rules/picking-type-delete';
import { type PickingTypeEventRecord } from 'src/stock/picking-type/types/picking-type-event-record.type';

const staffDelete = (recordId: string) =>
  ({ recordId, workspaceMemberId: 'member-1', properties: {} }) as unknown as ObjectRecordEvent<PickingTypeEventRecord>;

const run = async ({ used, failingPutBack = [] }: { used: string[]; failingPutBack?: string[] }) => {
  const deleted = new Set(['receipts', 'deliveries', 'internal']);
  const destroyedLinksOf: string[] = [];
  const errors = errorCollector();

  await makeHandlePickingTypeDeletes({
    isUsed: async (id) => used.includes(id),
    putBack: async (event) => {
      if (failingPutBack.includes(event.recordId)) {
        throw new Error('timeout');
      }
      deleted.delete(event.recordId);
    },
    stillDeleted: async (ids) => ids.filter((id) => deleted.has(id)),
    destroyWaveLinks: async (ids) => {
      destroyedLinksOf.push(...ids);
    },
  })([staffDelete('receipts'), staffDelete('deliveries'), staffDelete('internal')], 'deleted', errors);

  return { destroyedLinksOf, errors };
};

describe('deleting operation types', () => {
  it('removes the wave links of the types that stay deleted, not of a type put back for its transfers', async () => {
    const { destroyedLinksOf } = await run({ used: ['deliveries'] });

    expect(destroyedLinksOf).toEqual(['receipts', 'internal']);
  });

  it('keeps the wave links of a used type whose put-back failed, and reports the failure', async () => {
    const { destroyedLinksOf, errors } = await run({ used: ['deliveries'], failingPutBack: ['deliveries'] });

    expect(destroyedLinksOf).toEqual(['receipts', 'internal']);
    expect(() => errors.throwIfAny()).toThrow('deliveries: timeout');
  });
});
