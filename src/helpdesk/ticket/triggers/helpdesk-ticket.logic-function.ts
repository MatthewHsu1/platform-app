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
import {
  attachSlasToCasesWithNewTeam,
  attachSlasToNewCases,
  recomputeSlasOnStageSave,
  restoreSlaRowsOfCases,
} from 'src/helpdesk-sla/case-sla-hooks';
import { clearCaseFromLeads } from 'src/helpdesk-crm/clear-case-from-leads';
import { fillCaseLocations, refuseCloseWithOpenOrders } from 'src/helpdesk-fieldservice/apply-case-fieldservice';
import 'src/helpdesk-fieldservice/case-fieldservice-delete-entries';
import { recomputeTicketCounts } from 'src/helpdesk-fieldservice/recompute-ticket-counts';
import 'src/helpdesk-sla/sla-delete-entries';
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
  const warnings: string[] = [];

  if (operation === 'created') {
    const result = await applyCaseCreates(events.map(toCaseEvent), TWENTY_CASE_API, now);
    const locationIds: (string | null | undefined)[] = events.map((event) => sideOf(event, 'after')?.fsmLocationId);

    await errors.run('service locations', async () => {
      locationIds.push(...(await fillCaseLocations(events.map(toCaseEvent), 'created')));
      await recomputeTicketCounts(locationIds);
    });

    await errors.run('service levels', async () => {
      warnings.push(...(await attachSlasToNewCases(result.created, now)));
    });
    await errors.run('team counts', () => recomputeTeamCounts(result.teamsToCount));
  } else if (operation === 'updated') {
    let caseEvents = events.map(toCaseEvent);

    // Before the case rules plan: a refused close leaves the stage as it was.
    await errors.run('open service orders', async () => {
      caseEvents = await refuseCloseWithOpenOrders(caseEvents, errors);
    });
    const result = await applyCaseUpdates(caseEvents, TWENTY_CASE_API, now);

    await errors.run('service locations', async () => {
      const filled = await fillCaseLocations(caseEvents, 'updated');

      await recomputeTicketCounts([...events.flatMap((event) => [sideOf(event, 'before')?.fsmLocationId, sideOf(event, 'after')?.fsmLocationId]), ...filled]);
    });

    await errors.run('service levels', async () => {
      warnings.push(...(await attachSlasToCasesWithNewTeam(result.teamSet, now)));
      await recomputeSlasOnStageSave(result.stageSaved, now);
    });
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
    await errors.run('service location counts', () => recomputeTicketCounts(events.map((event) => sideOf(event, 'before')?.fsmLocationId)));
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
    await errors.run('service location counts', () => recomputeTicketCounts(events.map((event) => sideOf(event, 'before')?.fsmLocationId)));
  }
  errors.throwIfAny();

  // The service level engine reports a team without working hours here, where the function's log shows it.
  return { warnings };
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
