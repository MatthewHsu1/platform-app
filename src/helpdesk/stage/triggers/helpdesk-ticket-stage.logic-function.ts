import { type DatabaseEventBatchPayload, defineLogicFunction, type ObjectRecordEvent } from 'twenty-sdk/define';

import { writeApplicationVariables } from 'src/crm/settings/write-application-variables';
import { applyDeleteRules } from 'src/helpdesk/delete-rules/apply-delete-rules';
import { STAGE_DELETE_RULES } from 'src/helpdesk/delete-rules/stage-delete-rules';
import { HELPDESK_MESSAGES } from 'src/helpdesk/helpdesk-messages.constant';
import { HELPDESK_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS } from 'src/helpdesk/helpdesk-universal-identifiers.constant';
import { readHelpdeskSettings } from 'src/helpdesk/read-helpdesk-settings';
import { recomputeTeamCounts } from 'src/helpdesk/recompute-team-counts';
import 'src/helpdesk/stage/stage-delete-entries';
import { syncCaseBoardGroups } from 'src/helpdesk/stage/sync-case-board-groups';
import { planStageDelete } from 'src/helpdesk/stage/utils/plan-stage-delete.util';
import 'src/helpdesk-sla/sla-delete-entries';
import { readEvents } from 'src/shared/triggers/batch-events';
import { restoreIfStillDeleted } from 'src/shared/triggers/put-back';
import { records } from 'src/shared/triggers/records';
import { errorCollector } from 'src/shared/triggers/retry-on-conflict';
import { groupBy } from 'src/shared/utils/group-by.util';
import { eventAfter, eventChangedFields, localizedReason } from 'src/stock/stock-event-helpers';

type StageRecord = { id: string; unattended: boolean | null; closed: boolean | null; sequence: number | null; fold: boolean | null };

const stages = records('helpdeskTicketStage', 'helpdeskTicketStages');
const cases = records('helpdeskTicket', 'helpdeskTickets');

const handler = async (payload: DatabaseEventBatchPayload<ObjectRecordEvent<StageRecord>>) => {
  const { operation, events } = readEvents<StageRecord>(payload);
  const errors = errorCollector();

  // The board keeps one column per stage, in stage order, and hides the folded ones.
  if (operation === 'created' || operation === 'restored') {
    await errors.run('board columns', syncCaseBoardGroups);
  }
  if (operation === 'updated') {
    if (events.some((event) => eventChangedFields(event, ['sequence', 'fold']).length > 0)) {
      await errors.run('board columns', syncCaseBoardGroups);
    }
    const unattendedChanged = events.filter((event) => eventChangedFields(event, ['unattended']).length > 0);
    const closedChanged = events.filter((event) => eventChangedFields(event, ['closed']).length > 0);

    // The case copy of a stage's unattended flag follows the stage.
    if (unattendedChanged.length > 0) {
      await errors.run('unattended cases', async () => {
        const rows = await cases.find<{ id: string; stageId: string; unattended: boolean | null }>(
          { stageId: { in: unattendedChanged.map((event) => event.recordId) } },
          'id stageId unattended',
        );
        const value = new Map(unattendedChanged.map((event) => [event.recordId, eventAfter(event)?.unattended === true]));
        const stale = rows.filter((row) => (row.unattended ?? false) !== value.get(row.stageId));

        for (const [unattended, group] of groupBy(stale, (row) => String(value.get(row.stageId) === true))) {
          await cases.updateMany(
            group.map((row) => row.id),
            { unattended: unattended === 'true' },
          );
        }
      });
    }
    // A closed stage leaves a team's open counts; the closed date of old cases stays as it is.
    if (closedChanged.length > 0) {
      await errors.run('team counts', async () => {
        const rows = await cases.find<{ teamId: string | null }>(
          { stageId: { in: closedChanged.map((event) => event.recordId) } },
          'teamId',
        );

        await recomputeTeamCounts(rows.flatMap((row) => row.teamId ?? []));
      });
    }
  }

  if (operation === 'deleted') {
    const ids = events.map((event) => event.recordId);
    const used = await cases.find<{ id: string; stageId: string | null; active: boolean | null; deletedAt: string | null }>(
      { stageId: { in: ids } },
      'id stageId active deletedAt',
    );
    const plan = planStageDelete({ deletedStageIds: ids, cases: used });

    // Every delete is checked, whoever made it.
    for (const stageId of plan.restore) {
      const event = events.find((candidate) => candidate.recordId === stageId);

      await errors.run(stageId, async () =>
        restoreIfStillDeleted({
          objectSingular: stages.objectSingular,
          objectPlural: stages.objectPlural,
          recordId: stageId,
          reason: await localizedReason(event ?? {}, HELPDESK_MESSAGES.stageInUse),
        }),
      );
    }
    if (plan.allowed.length > 0) {
      await errors.run('board columns', syncCaseBoardGroups);
      await errors.run('delete rules', () => applyDeleteRules(stages, STAGE_DELETE_RULES, plan.allowed));
      // The stage a duplicate moves to is part of the settings; a deleted stage empties it.
      await errors.run('duplicate stage setting', async () => {
        const { duplicateStageId } = await readHelpdeskSettings();

        if (duplicateStageId !== null && plan.allowed.includes(duplicateStageId)) {
          await writeApplicationVariables({ HELPDESK_DUPLICATE_TICKET_STAGE: '' });
        }
      });
    }
  }
  errors.throwIfAny();

  return {};
};

export default defineLogicFunction({
  universalIdentifier: HELPDESK_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS.helpdeskTicketStage,
  name: 'platform-helpdesk-ticket-stage',
  description:
    'Puts back a deleted work case stage that cases still use, removes the team links of a stage that goes, empties the duplicate stage setting when it names it, and keeps the unattended flag and the team counts of cases right after a stage changes.',
  timeoutSeconds: 120,
  handler,
  databaseEventTriggerSettings: { eventName: 'helpdeskTicketStage.*', batchMode: true },
});
