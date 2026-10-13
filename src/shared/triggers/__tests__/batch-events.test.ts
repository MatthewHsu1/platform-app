import { type DatabaseEventBatchPayload, type ObjectRecordEvent } from 'twenty-sdk/define';
import { describe, expect, it } from 'vitest';

import { readEvents } from 'src/shared/triggers/batch-events';

type Row = { id: string; seedKey: string | null; name: string | null; pushDomain: Record<string, unknown> | null };

// Twenty's record events carry "" for a TEXT field whose column is NULL, as its API reads do.
describe('readEvents', () => {
  it('reads an empty text field before and after the save as no value', () => {
    const payload = {
      name: 'productRemoval.updated',
      events: [
        {
          recordId: 'r1',
          properties: {
            updatedFields: ['name'],
            diff: {},
            before: { id: 'r1', seedKey: '', name: 'First in', pushDomain: { origin: '' } },
            after: { id: 'r1', seedKey: '', name: '', pushDomain: { origin: '' } },
          },
        },
      ],
    } as unknown as DatabaseEventBatchPayload<ObjectRecordEvent<Row>>;

    const { operation, events } = readEvents(payload);

    expect(operation).toBe('updated');
    expect(events[0].properties).toMatchObject({
      before: { id: 'r1', seedKey: null, name: 'First in', pushDomain: { origin: '' } },
      after: { id: 'r1', seedKey: null, name: null, pushDomain: { origin: '' } },
    });
  });
});
