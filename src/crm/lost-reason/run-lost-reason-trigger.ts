import { type RecordOperation } from 'src/shared/triggers/batch-events';
import { errorCollector } from 'src/shared/triggers/retry-on-conflict';

export const LOST_REASON_IN_USE_MESSAGE = 'This lost reason is used by leads. Archive it instead (untick Active).';

type ReasonEvent = { recordId: string; workspaceMemberId?: string; properties: Record<string, unknown> };

type LostReasonTriggerApi = {
  reasonIdsUsedByLeads: (reasonIds: string[]) => Promise<Set<string>>;
  restoreReason: (reasonId: string, reason: string) => Promise<void>;
  memberLocale: (workspaceMemberId: string | undefined) => Promise<string>;
  translate: (locale: string | null, message: string) => string;
};

// Deletes are checked for every writer: a reason a lead still uses comes back.
export const makeRunLostReasonTrigger =
  (api: LostReasonTriggerApi) =>
  async ({ operation, events }: { operation: RecordOperation; events: ReasonEvent[] }) => {
    if (operation !== 'deleted') {
      return;
    }
    const used = await api.reasonIdsUsedByLeads(events.map((event) => event.recordId));
    const errors = errorCollector();

    for (const event of events.filter((candidate) => used.has(candidate.recordId))) {
      await errors.run(event.recordId, async () =>
        api.restoreReason(event.recordId, api.translate(await api.memberLocale(event.workspaceMemberId), LOST_REASON_IN_USE_MESSAGE)),
      );
    }
    errors.throwIfAny();
  };
