import { type LeadContext } from 'src/crm/lead/types/lead-context.type';
import { type LeadEvent } from 'src/crm/lead/types/lead-event.type';
import { type LeadRow } from 'src/crm/lead/types/lead-row.type';
import { composeLeadWrite } from 'src/crm/lead/utils/plan-lead-write.util';
import { sameValue } from 'src/shared/utils/same-value.util';

// The saves of a batch apply in order only while the stored lead still holds
// what the last of them wrote; a newer save of the same field has its own
// event in a later batch, so here only the computes run. A field the read
// does not hold cannot be compared and is not replayed either.
const isFresh = (events: LeadEvent[], current: LeadRow, readFields: ReadonlySet<string>) => {
  const lastValue = new Map<string, unknown>();

  for (const event of events) {
    event.written.forEach((field) => {
      if (readFields.has(field)) {
        lastValue.set(field, event.after[field as keyof LeadRow]);
      }
    });
  }

  return [...lastValue].every(([field, value]) => sameValue(current[field as keyof LeadRow], value));
};

export const planLeadBatch = ({
  operation,
  events,
  current,
  now,
  context,
  opportunityNameTemplate,
  readFields,
}: {
  operation: 'created' | 'updated' | 'restored';
  events: LeadEvent[];
  current: LeadRow;
  now: string;
  context: LeadContext;
  opportunityNameTemplate?: string;
  readFields: ReadonlySet<string>;
}) => {
  const fresh = operation !== 'updated' || isFresh(events, current, readFields);

  return composeLeadWrite({
    operation,
    current,
    // A create plans on the stored row, so a value set since is never overwritten.
    steps: events.map((event) => ({
      before: event.before,
      after: operation === 'created' ? current : event.after,
      written: event.written,
      staff: fresh && !event.appWrite,
      creatorMemberId: event.creatorMemberId,
    })),
    now,
    context,
    opportunityNameTemplate,
    readFields,
  });
};
