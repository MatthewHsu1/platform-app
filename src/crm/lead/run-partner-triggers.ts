import { type ObjectRecordEvent } from 'twenty-sdk/define';

import { type PartnerTriggerApi } from 'src/crm/lead/types/partner-trigger-api.type';
import { planPersonContactSync } from 'src/crm/lead/utils/plan-partner-sync.util';
import { type RecordOperation } from 'src/shared/triggers/batch-events';
import { updatedFieldsOf } from 'src/shared/triggers/event-values';
import { errorCollector } from 'src/shared/triggers/retry-on-conflict';

type PartnerEvent = ObjectRecordEvent<Record<string, unknown>>;

// A deleted contact or company leaves its leads, unless it was put back
// before this run. The lead rules then empty the names it gave them.
const clearDeletedLinks = async (
  api: PartnerTriggerApi,
  objectSingular: 'person' | 'company',
  field: 'personId' | 'companyId',
  events: PartnerEvent[],
) => {
  const deleted = await api.stillDeleted(
    objectSingular,
    events.map((event) => event.recordId),
  );
  const linked = await api.readLeadsOf(field, deleted);

  if (linked.length > 0) {
    await api.writeLeads(linked.map((lead) => ({ leadId: lead.id, data: { [field]: null } })));
  }
};

// Runs for every writer, Platform's own pushes too: an email a lead sent to
// its contact must reach the contact's other leads. A lead that already holds
// the value is not written, so the round trip stops there.
export const makeRunPersonTrigger =
  (api: PartnerTriggerApi) =>
  async ({ operation, events }: { operation: RecordOperation; events: PartnerEvent[] }) => {
    const errors = errorCollector();

    if (operation === 'updated') {
      // An email change copies the email only and a phone change the phone
      // only, so a lead keeps an email the contact could not take.
      const changedParts = new Map<string, { email: boolean; phone: boolean }>();

      for (const event of events) {
        const fields = updatedFieldsOf(event);
        const parts = changedParts.get(event.recordId) ?? { email: false, phone: false };

        changedParts.set(event.recordId, {
          email: parts.email || fields.includes('emails'),
          phone: parts.phone || fields.includes('phones'),
        });
      }

      const changedIds = [...changedParts].flatMap(([id, parts]) => (parts.email || parts.phone ? [id] : []));

      if (changedIds.length > 0) {
        await errors.run('contact changes', async () => {
          const contacts = new Map((await api.readPeople(changedIds)).map((person) => [person.id, person]));
          const writes = (await api.readLeadsOf('personId', changedIds)).flatMap((lead) => {
            const person = lead.personId === null ? undefined : contacts.get(lead.personId);
            const changed = lead.personId === null ? undefined : changedParts.get(lead.personId);
            const data = person === undefined || changed === undefined ? {} : planPersonContactSync({ lead, person, changed });

            return Object.keys(data).length === 0 ? [] : [{ leadId: lead.id, data }];
          });

          if (writes.length > 0) {
            await api.writeLeads(writes);
          }
        });
      }
    }

    if (operation === 'deleted') {
      await errors.run('contact deletes', () => clearDeletedLinks(api, 'person', 'personId', events));
    }

    errors.throwIfAny();
  };

// A company edit changes no lead: its name, website and address reach a lead
// only when the lead's links change.
export const makeRunCompanyTrigger =
  (api: PartnerTriggerApi) =>
  async ({ operation, events }: { operation: RecordOperation; events: PartnerEvent[] }) => {
    if (operation === 'deleted') {
      await clearDeletedLinks(api, 'company', 'companyId', events);
    }
  };
