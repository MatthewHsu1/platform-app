import { type DatabaseEventBatchPayload, defineLogicFunction, type ObjectRecordEvent } from 'twenty-sdk/define';

import 'src/helpdesk/category/category-delete-entries';
import { applyDeleteRules } from 'src/helpdesk/delete-rules/apply-delete-rules';
import { CATEGORY_DELETE_RULES } from 'src/helpdesk/delete-rules/category-delete-rules';
import { HELPDESK_MESSAGES } from 'src/helpdesk/helpdesk-messages.constant';
import { HELPDESK_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS } from 'src/helpdesk/helpdesk-universal-identifiers.constant';
import { runTreePass } from 'src/helpdesk/tree/run-tree-pass';
import { readEvents } from 'src/shared/triggers/batch-events';
import { restoreCascaded } from 'src/shared/triggers/cascade-restore';
import { records } from 'src/shared/triggers/records';
import { errorCollector } from 'src/shared/triggers/retry-on-conflict';
import { restoredParents } from 'src/stock/stock-event-helpers';

type CategoryRecord = { id: string; name: string | null; parentId: string | null; completeName: string | null; deletedAt?: string | null };

const categories = records('helpdeskTicketCategory', 'helpdeskTicketCategories');

const handler = async (payload: DatabaseEventBatchPayload<ObjectRecordEvent<CategoryRecord>>) => {
  const { operation, events } = readEvents<CategoryRecord>(payload);
  const errors = errorCollector();

  // The child categories go to the trash with their parent, and come back with it.
  if (operation === 'deleted') {
    await errors.run('delete rules', () =>
      applyDeleteRules(
        categories,
        CATEGORY_DELETE_RULES,
        events.map((event) => event.recordId),
      ),
    );
  }
  if (operation === 'restored') {
    await errors.run('child categories', () =>
      restoreCascaded({ parents: restoredParents(events), children: [{ of: categories, field: 'parentId' }] }),
    );
  }
  if (operation === 'created' || operation === 'updated' || operation === 'restored') {
    await errors.run('full names', () =>
      runTreePass({ rows: categories, operation, events, refusal: HELPDESK_MESSAGES.categoryOwnParent }),
    );
  }
  errors.throwIfAny();

  return {};
};

export default defineLogicFunction({
  universalIdentifier: HELPDESK_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS.helpdeskTicketCategory,
  name: 'platform-helpdesk-ticket-category',
  description:
    'Keeps the full name of each work case category right, refuses a category under itself, deletes and restores child categories with their parent, and clears a deleted category from its cases and links.',
  timeoutSeconds: 120,
  handler,
  databaseEventTriggerSettings: { eventName: 'helpdeskTicketCategory.*', batchMode: true },
});
