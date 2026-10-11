import { type DatabaseEventBatchPayload, defineLogicFunction, type ObjectRecordEvent } from 'twenty-sdk/define';

import { WON_STATUS } from 'src/crm/crm-options.constant';
import { CRM_STAGE_TRIGGER_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER } from 'src/crm/crm-universal-identifiers.constant';
import { leadExistsWhere } from 'src/crm/lead/lead-exists-where';
import { writeLeadsAsApplication } from 'src/crm/lead/write-leads-as-application';
import { cascadeStageDelete } from 'src/crm/stage/cascade-stage-delete';
import { makeRunStageTrigger } from 'src/crm/stage/run-stage-trigger';
import { syncStageBoardGroups } from 'src/crm/stage/stage-board-groups';
import { readMemberLocale } from 'src/shared/i18n/read-user-locale';
import { translate } from 'src/shared/i18n/translate';
import { readEvents } from 'src/shared/triggers/batch-events';
import { restoreIfStillDeleted } from 'src/shared/triggers/put-back';
import { records } from 'src/shared/triggers/records';

const STAGES = { objectSingular: 'crmStage', objectPlural: 'crmStages' } as const;
const leads = records('crmLead', 'crmLeads');

const runStageTrigger = makeRunStageTrigger({
  stageIdsUsedByLeads: async (stageIds) => {
    const used = new Set<string>();

    for (const stageId of stageIds) {
      if (await leadExistsWhere({ stageId: { eq: stageId } })) {
        used.add(stageId);
      }
    }
    return used;
  },
  restoreStage: (stageId, reason) => restoreIfStillDeleted({ ...STAGES, recordId: stageId, reason }),
  // Lost leads are left as they are, like archived records.
  openLeadIdsInStages: async (stageIds) =>
    (
      await leads.find<{ id: string }>(
        { stageId: { in: stageIds }, or: [{ wonStatus: { neq: WON_STATUS.LOST } }, { wonStatus: { is: 'NULL' } }] },
        'id',
      )
    ).map((lead) => lead.id),
  writeLeads: (writes, options) => writeLeadsAsApplication(writes, options),
  syncBoardGroups: syncStageBoardGroups,
  cascadeStageDelete,
  memberLocale: readMemberLocale,
  translate: (locale, message) => translate(locale, message),
});

const handler = async (payload: DatabaseEventBatchPayload<ObjectRecordEvent<Record<string, unknown>>>) => {
  const { operation, events } = readEvents(payload);

  await runStageTrigger({ operation, events });

  return {};
};

export default defineLogicFunction({
  universalIdentifier: CRM_STAGE_TRIGGER_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'platform-crm-stage',
  description:
    'Puts back a deleted stage that still holds leads, keeps one board column per stage in stage order, and sets the leads of a stage marked won to 100 %.',
  timeoutSeconds: 300,
  handler,
  databaseEventTriggerSettings: { eventName: 'crmStage.*', batchMode: true },
});
