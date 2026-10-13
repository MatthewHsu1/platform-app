import { type DatabaseEventBatchPayload, defineLogicFunction, type ObjectRecordEvent } from 'twenty-sdk/define';

import { HELPDESK_TICKET_RELATED_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER } from 'src/helpdesk-ticket-related/helpdesk-ticket-related-universal-identifiers.constant';
import { type RelatedLink } from 'src/helpdesk-ticket-related/types/related-link.type';
import { planRelatedMirror } from 'src/helpdesk-ticket-related/utils/plan-related-mirror.util';
import { isApplicationWrite, isStaffDelete } from 'src/shared/triggers/actor';
import { readEvents } from 'src/shared/triggers/batch-events';
import { records } from 'src/shared/triggers/records';
import { errorCollector, retryOnConflict } from 'src/shared/triggers/retry-on-conflict';
import { eventAfter, eventBefore } from 'src/stock/stock-event-helpers';

type LinkRecord = RelatedLink & { updatedBy?: { source?: string | null } | null };

const related = records('helpdeskTicketRelated', 'helpdeskTicketRelateds');

const readLinksOf = async (caseIds: string[]) => {
  const rows = await related.find<RelatedLink>(
    { or: [{ ticketId: { in: caseIds } }, { relatedTicketId: { in: caseIds } }] },
    'id ticketId relatedTicketId',
  );

  return rows;
};

const toLink = (record: RelatedLink): RelatedLink => ({ id: record.id, ticketId: record.ticketId, relatedTicketId: record.relatedTicketId });

const handler = async (payload: DatabaseEventBatchPayload<ObjectRecordEvent<LinkRecord>>) => {
  const { operation, events } = readEvents<LinkRecord>(payload);
  const errors = errorCollector();

  // A link staff make gets its link back. A link the app makes (a copy of a case) stays one-way.
  if (operation === 'created') {
    const created = events.flatMap((event) => {
      const after = eventAfter(event);

      return after === undefined || isApplicationWrite(after) ? [] : [toLink(after)];
    });

    if (created.length > 0) {
      await errors.run('links back', () =>
        retryOnConflict(async () => {
          const existing = await readLinksOf([...new Set(created.flatMap((row) => [row.ticketId, row.relatedTicketId]))]);
          const plan = planRelatedMirror({ created, destroyed: [], existing });

          if (plan.create.length > 0) {
            await related.createMany(plan.create);
          }
        }),
      );
    }
  }

  // Twenty trashes a removed link; the same link could not be made again while the trashed row holds
  // the unique pair, so the row is destroyed, and the link back with it when staff removed the link.
  if (operation === 'deleted') {
    const trashed = events.map((event) => event.recordId);
    const removedByStaff = events.flatMap((event) => {
      const before = eventBefore(event);

      return before === undefined || !isStaffDelete(event) ? [] : [toLink(before)];
    });

    await errors.run('destroy trashed links', () => related.destroySoftDeleted(trashed).then(() => undefined));
    if (removedByStaff.length > 0) {
      await errors.run('links back', async () => {
        const existing = await readLinksOf([...new Set(removedByStaff.flatMap((row) => [row.ticketId, row.relatedTicketId]))]);
        const plan = planRelatedMirror({ created: [], destroyed: removedByStaff, existing });

        if (plan.destroy.length > 0) {
          await related.destroyMany(plan.destroy);
        }
      });
    }
  }
  errors.throwIfAny();

  return {};
};

export default defineLogicFunction({
  universalIdentifier: HELPDESK_TICKET_RELATED_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'platform-helpdesk-ticket-related',
  description: 'Makes the link back when staff relate one work case to another, and removes it when staff remove the link.',
  timeoutSeconds: 120,
  handler,
  databaseEventTriggerSettings: { eventName: 'helpdeskTicketRelated.*', batchMode: true },
});
