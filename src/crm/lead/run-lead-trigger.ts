import { type ObjectRecordEvent } from 'twenty-sdk/define';

import { readLeadRow } from 'src/crm/lead/lead-selection';
import { type LeadEvent } from 'src/crm/lead/types/lead-event.type';
import { type LeadRow } from 'src/crm/lead/types/lead-row.type';
import { type LeadTriggerApi } from 'src/crm/lead/types/lead-trigger-api.type';
import { type StatusMoves } from 'src/crm/lead/types/status-moves.type';
import { planLeadBatch } from 'src/crm/lead/utils/plan-lead-batch.util';
import { DEFAULT_OPPORTUNITY_NAME_TEMPLATE } from 'src/crm/lead/utils/plan-lead-computes.util';
import { writtenLeadFields, writtenOnCreate } from 'src/crm/lead/utils/written-fields.util';
import { isApplicationWrite } from 'src/shared/triggers/actor';
import { type RecordOperation } from 'src/shared/triggers/batch-events';
import { updatedFieldsOf } from 'src/shared/triggers/event-values';
import { errorCollector } from 'src/shared/triggers/retry-on-conflict';

type RawEvent = ObjectRecordEvent<Record<string, unknown>>;

const toLeadEvent = (operation: RecordOperation, event: RawEvent, current: LeadRow): LeadEvent => {
  const properties = event.properties as { before?: Record<string, unknown>; after?: Record<string, unknown> };
  const after = properties.after === undefined ? current : readLeadRow(properties.after);
  const appWrite = isApplicationWrite(after);

  return {
    before: properties.before === undefined ? null : readLeadRow(properties.before),
    after,
    written:
      operation === 'created'
        ? writtenOnCreate(current)
        : writtenLeadFields(updatedFieldsOf(event)),
    appWrite,
    creatorMemberId:
      operation === 'created' && !appWrite ? (after.createdBy?.workspaceMemberId ?? event.workspaceMemberId ?? null) : null,
  };
};

export const makeRunLeadTrigger =
  (api: LeadTriggerApi) =>
  async ({ operation, events }: { operation: RecordOperation; events: RawEvent[] }) => {
    // A delete or destroy changes nothing on other records.
    if (operation !== 'created' && operation !== 'updated' && operation !== 'restored') {
      return;
    }
    const leads = await api.readLeads([...new Set(events.map((event) => event.recordId))]);
    const context = await api.loadContext(leads);
    const now = api.now();
    const errors = errorCollector();
    const moves: { lead: LeadRow; moves: StatusMoves }[] = [];
    const locales = new Map<string | undefined, Promise<string>>();
    const localeOf = (workspaceMemberId: string | undefined) => {
      const known = locales.get(workspaceMemberId) ?? api.memberLocale(workspaceMemberId);

      locales.set(workspaceMemberId, known);
      return known;
    };

    for (const current of leads) {
      await errors.run(current.id, async () => {
        const ownEvents = events.filter((event) => event.recordId === current.id);
        const leadEvents = ownEvents.map((event) => toLeadEvent(operation, event, current));
        const staffMemberId = ownEvents.filter((_event, index) => !leadEvents[index].appWrite).pop()?.workspaceMemberId;
        const locale = await localeOf(staffMemberId);
        const plan = planLeadBatch({
          operation,
          events: leadEvents,
          current,
          now,
          context,
          opportunityNameTemplate: api.translate(locale, DEFAULT_OPPORTUNITY_NAME_TEMPLATE),
          readFields: api.readFields,
        });

        if (plan.kind === 'refuse') {
          const reason = api.translate(locale, plan.reason);

          if (plan.undo.kind === 'putBack') {
            await api.putBackLead(current.id, plan.undo.data, reason);
            if (plan.undo.statusMoves.won !== 0 || plan.undo.statusMoves.lost !== 0) {
              moves.push({ lead: { ...current, ...plan.undo.data } as LeadRow, moves: plan.undo.statusMoves });
            }
            return;
          }
          // A destroyed lead has no page to hold a note, so the run's error says why.
          await api.destroyLead(current.id);
          throw new Error(`The new lead was removed. ${reason}`);
        }
        if (Object.keys(plan.data).length > 0) {
          await api.updateLead(current.id, plan.data);
        }
        if (plan.personPush !== null) {
          await api.pushPerson(plan.personPush);
        }
        if (plan.statusMoves.won !== 0 || plan.statusMoves.lost !== 0) {
          moves.push({ lead: { ...current, ...plan.data } as LeadRow, moves: plan.statusMoves });
        }
      });
    }
    if (moves.length > 0) {
      await errors.run('scoring counts', () => api.applyStatusMoves(moves));
    }
    errors.throwIfAny();
  };
