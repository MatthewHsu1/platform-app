import { type DatabaseEventBatchPayload, defineLogicFunction, type ObjectRecordEvent } from 'twenty-sdk/define';

import 'src/fieldservice-stock/order-delete-entries';
import { fsmOrders } from 'src/fieldservice/fieldservice-records';
import { FIELDSERVICE_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS } from 'src/fieldservice/fieldservice-universal-identifiers.constant';
import { applyOrderSaves, refuseOrderDeletes } from 'src/fieldservice/order/apply-order-events';
import { fillOrderDescriptions } from 'src/fieldservice/order/fill-order-descriptions';
import { ORDER_DELETE_RULES } from 'src/fieldservice/order/order-delete-rules';
import { readOrderState } from 'src/fieldservice/order/order-state';
import { recomputeTeamCounts } from 'src/fieldservice/team/recompute-team-counts';
import { applyDeleteRules } from 'src/helpdesk/delete-rules/apply-delete-rules';
import { readEvents } from 'src/shared/triggers/batch-events';
import { updatedFieldsOf } from 'src/shared/triggers/event-values';
import { errorCollector } from 'src/shared/triggers/retry-on-conflict';

type RawEvent = ObjectRecordEvent<Record<string, unknown>>;

const teamBefore = (event: RawEvent) => {
  const before = (event.properties as { before?: Record<string, unknown> }).before;

  return before === undefined ? null : readOrderState(before).teamId;
};

const handler = async (payload: DatabaseEventBatchPayload<RawEvent>) => {
  const { operation, events } = readEvents(payload);
  const errors = errorCollector();
  const warnings: string[] = [];

  if (operation === 'created' || operation === 'updated') {
    const result = await applyOrderSaves(operation, events, new Date().toISOString());

    warnings.push(...result.warnings);
    const typeSaved = events.filter((event) => updatedFieldsOf(event).includes('orderTypeId')).map((event) => event.recordId);

    await errors.run('descriptions', () => fillOrderDescriptions(operation === 'created' ? events.map((event) => event.recordId) : typeSaved));
    await errors.run('team counts', () => recomputeTeamCounts(result.teamsToCount));
  } else if (operation === 'deleted') {
    const allowed = await refuseOrderDeletes(events);

    await errors.run('delete rules', () => applyDeleteRules(fsmOrders, ORDER_DELETE_RULES, allowed));
    await errors.run('team counts', () => recomputeTeamCounts(events.map(teamBefore)));
  } else if (operation === 'destroyed' || operation === 'restored') {
    const rows = await fsmOrders.findIncludingDeleted<{ teamId: string | null }>({ id: { in: events.map((event) => event.recordId) } }, 'teamId');

    await errors.run('team counts', () => recomputeTeamCounts([...events.map(teamBefore), ...rows.map((row) => row.teamId)]));
  }
  errors.throwIfAny();

  // A refused new order is removed; the function's log shows why.
  return { warnings };
};

export default defineLogicFunction({
  universalIdentifier: FIELDSERVICE_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS.fsmOrder,
  name: 'platform-fsm-order',
  description:
    'Numbers service orders, keeps their team, schedule, request window, directions, instructions, closed status and service area right, refuses a manual completion, a holiday start and a delete outside New, and keeps the team counts.',
  timeoutSeconds: 300,
  handler,
  databaseEventTriggerSettings: { eventName: 'fsmOrder.*', batchMode: true },
});
