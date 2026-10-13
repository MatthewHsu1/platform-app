import { type DatabaseEventBatchPayload, type ObjectRecordEvent } from 'twenty-sdk/define';

import { readEvents } from 'src/shared/triggers/batch-events';
import { type Records } from 'src/shared/triggers/records';

// Removing a many-to-many link must delete its row. Twenty soft-deletes it,
// and the unique link index would then refuse the same link again, so a
// soft-deleted link row is destroyed.
export const destroyDeletedLinksHandler =
  (links: Records) => async (payload: DatabaseEventBatchPayload<ObjectRecordEvent<object>>) => {
    const { operation, events } = readEvents(payload);

    if (operation === 'deleted') {
      await links.destroySoftDeleted(events.map((event) => event.recordId));
    }

    return {};
  };
