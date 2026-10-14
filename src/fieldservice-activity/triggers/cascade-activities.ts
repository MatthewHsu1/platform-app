import { type ObjectRecordEvent } from 'twenty-sdk/define';

import { applyDeleteRules } from 'src/helpdesk/delete-rules/apply-delete-rules';
import { fsmActivities } from 'src/fieldservice-activity/fieldservice-activity-records';
import { restoreCascaded } from 'src/shared/triggers/cascade-restore';
import { type Records } from 'src/shared/triggers/records';
import { restoredParents } from 'src/stock/stock-event-helpers';

type RawEvent = ObjectRecordEvent<Record<string, unknown>>;

// The items of an order or template go to the trash with it and come back with it. A hard delete is the
// database's cascade on the relation.
export const cascadeActivities = async ({
  parents,
  field,
  operation,
  events,
}: {
  parents: Records;
  field: 'fsmOrderId' | 'fsmTemplateId';
  operation: string;
  events: RawEvent[];
}) => {
  if (operation === 'deleted') {
    await applyDeleteRules(
      parents,
      { references: [], cascades: [{ of: fsmActivities, field }], links: [] },
      events.map((event) => event.recordId),
    );
  }
  if (operation === 'restored') {
    await restoreCascaded({ parents: restoredParents(events), children: [{ of: fsmActivities, field }] });
  }
};
