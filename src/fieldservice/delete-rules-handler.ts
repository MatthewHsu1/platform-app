import { type DatabaseEventBatchPayload, type ObjectRecordEvent } from 'twenty-sdk/define';

import { applyDeleteRules } from 'src/helpdesk/delete-rules/apply-delete-rules';
import { type DeleteRules } from 'src/helpdesk/delete-rules/types/delete-rules.type';
import { readEvents } from 'src/shared/triggers/batch-events';
import { type Records } from 'src/shared/triggers/records';

// A trigger whose only work is what goes with a delete: references emptied, link rows removed for good.
export const deleteRulesHandler =
  (parents: Records, rules: DeleteRules) => async (payload: DatabaseEventBatchPayload<ObjectRecordEvent<object>>) => {
    const { operation, events } = readEvents(payload);

    if (operation === 'deleted') {
      await applyDeleteRules(
        parents,
        rules,
        events.map((event) => event.recordId),
      );
    }

    return {};
  };
