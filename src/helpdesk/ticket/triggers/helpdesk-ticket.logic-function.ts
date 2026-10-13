import { type DatabaseEventBatchPayload, defineLogicFunction, type ObjectRecordEvent } from 'twenty-sdk/define';

import { applyDeleteRules } from 'src/helpdesk/delete-rules/apply-delete-rules';
import { CASE_DELETE_RULES } from 'src/helpdesk/delete-rules/case-delete-rules';
import { HELPDESK_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS } from 'src/helpdesk/helpdesk-universal-identifiers.constant';
import { readCaseRow } from 'src/helpdesk/load-case-context';
import { recomputeTeamCounts } from 'src/helpdesk/recompute-team-counts';
import { applyCaseCreates, applyCaseUpdates } from 'src/helpdesk/ticket/apply-case-events';
import 'src/helpdesk/ticket/case-delete-entries';
import { TWENTY_CASE_API } from 'src/helpdesk/ticket/twenty-case-api';
import { type CaseEvent } from 'src/helpdesk/ticket/types/case-event.type';
import 'src/helpdesk-ticket-related/case-related-delete-entries';
import { attachSlasToNewCases, recomputeSlasOnStageSave, restoreSlaRowsOfCases } from 'src/helpdesk-sla/case-sla-hooks';
import { clearCaseFromLeads } from 'src/helpdesk-crm/clear-case-from-leads';
import { readEvents } from 'src/shared/triggers/batch-events';
import { updatedFieldsOf } from 'src/shared/triggers/event-values';
import { records } from 'src/shared/triggers/records';
import { errorCollector } from 'src/shared/triggers/retry-on-conflict';

type RawEvent = ObjectRecordEvent<Record<string, unknown>>;

const cases = records('helpdeskTicket', 'helpdeskTickets');

const sideOf = (event: RawEvent, side: 'before' | 'after') => {
  const properties = event.properties as { before?: Record<string, unknown>; after?: Record<string, unknown> };

  return properties[side] === undefined ? null : readCaseRow(properties[side]);
};

const toCaseEvent = (event: RawEvent): CaseEvent => {
  const before = sideOf(event, 'before');
  const after = sideOf(event, 'after') ?? (before as NonNullable<typeof before>);

  return {
    recordId: event.recordId,
    before,
    after,
    updatedFields: updatedFieldsOf(event),
    workspaceMemberId: event.workspaceMemberId ?? null,
  };
};

const handler = async (payload: DatabaseEventBatchPayload<RawEvent>) => {
  const { operation, events } = readEvents(payload);
  const now = new Date().toISOString();
  const errors = errorCollector();

  if (operation === 'created') {
    const result = await applyCaseCreates(events.map(toCaseEvent), TWENTY_CASE_API, now);

    await errors.run('service levels', () => attachSlasToNewCases(result.created, now));
    await errors.run('team counts', () => recomputeTeamCounts(result.teamsToCount));
  } else if (operation === 'updated') {
    const result = await applyCaseUpdates(events.map(toCaseEvent), TWENTY_CASE_API, now);

    await errors.run('service levels', () => recomputeSlasOnStageSave(result.stageSaved, now));
    await errors.run('team counts', () => recomputeTeamCounts(result.teamsToCount));
  } else if (operation === 'deleted' || operation === 'destroyed') {
    const ids = events.map((event) => event.recordId);

    if (operation === 'deleted') {
      await errors.run('delete rules', () => applyDeleteRules(cases, CASE_DELETE_RULES, ids));
      await errors.run('leads', () => clearCaseFromLeads(ids));
    }
    await errors.run('team counts', () =>
      recomputeTeamCounts(events.flatMap((event) => sideOf(event, 'before')?.teamId ?? [])),
    );
  } else if (operation === 'restored') {
    const restored = await cases.findIncludingDeleted<{ id: string; teamId: string | null }>(
      { id: { in: events.map((event) => event.recordId) } },
      'id teamId',
    );
    const deletedAt = new Map(events.map((event) => [event.recordId, sideOf(event, 'before')?.deletedAt ?? null]));

    await errors.run('service levels', () =>
      restoreSlaRowsOfCases(restored.map((row) => ({ id: row.id, deletedAt: deletedAt.get(row.id) ?? null }))),
    );
    await errors.run('team counts', () => recomputeTeamCounts(restored.flatMap((row) => row.teamId ?? [])));
  }
  errors.throwIfAny();

  return {};
};

export default defineLogicFunction({
  universalIdentifier: HELPDESK_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS.helpdeskTicket,
  name: 'platform-helpdesk-ticket',
  description:
    'Numbers, assigns, places and stamps work cases; keeps company, unattended flag and team counts; clears and removes what goes with a deleted case.',
  timeoutSeconds: 300,
  handler,
  databaseEventTriggerSettings: { eventName: 'helpdeskTicket.*', batchMode: true },
});
