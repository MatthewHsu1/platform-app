import { type StageTriggerApi } from 'src/crm/stage/types/stage-trigger-api.type';
import { type RecordOperation } from 'src/shared/triggers/batch-events';
import { errorCollector } from 'src/shared/triggers/retry-on-conflict';

export const STAGE_IN_USE_MESSAGE = 'This stage still holds leads. Move them to another stage first, then delete it.';

type StageEvent = {
  recordId: string;
  workspaceMemberId?: string;
  properties: { before?: Record<string, unknown>; after?: Record<string, unknown>; updatedFields?: string[] };
};

const BOARD_FIELDS = ['sequence', 'name'];

const changed = (event: StageEvent, field: string) =>
  (event.properties.updatedFields ?? []).includes(field) && event.properties.before?.[field] !== event.properties.after?.[field];

// Deletes are checked for every writer: a stage a lead still uses comes back.
export const makeRunStageTrigger =
  (api: StageTriggerApi) =>
  async ({ operation, events }: { operation: RecordOperation; events: StageEvent[] }) => {
    const errors = errorCollector();

    if (operation === 'deleted') {
      const ids = events.map((event) => event.recordId);
      const used = await api.stageIdsUsedByLeads(ids);

      for (const event of events.filter((candidate) => used.has(candidate.recordId))) {
        await errors.run(event.recordId, async () =>
          api.restoreStage(event.recordId, api.translate(await api.memberLocale(event.workspaceMemberId), STAGE_IN_USE_MESSAGE)),
        );
      }
      const allowed = ids.filter((id) => !used.has(id));

      if (allowed.length > 0) {
        await errors.run('board columns', () => api.syncBoardGroups());
        await errors.run('team links', () => api.cascadeStageDelete(allowed));
      }
      errors.throwIfAny();
      return;
    }

    if (operation === 'created' || operation === 'restored') {
      await api.syncBoardGroups();
      return;
    }
    if (operation !== 'updated') {
      return;
    }

    const madeWon = events.filter((event) => changed(event, 'isWon') && event.properties.after?.isWon === true).map((event) => event.recordId);
    const madeOpen = events.filter((event) => changed(event, 'isWon') && event.properties.after?.isWon !== true).map((event) => event.recordId);

    // A won stage keeps its leads at 100 %. Every lead not lost is written,
    // also one already there, so its closed date is stamped again.
    if (madeWon.length > 0) {
      await errors.run('leads of won stages', async () => {
        const leadIds = await api.openLeadIdsInStages(madeWon);

        if (leadIds.length > 0) {
          await api.writeLeads(leadIds.map((leadId) => ({ leadId, data: { probability: 100, automatedProbability: 100 } })));
        }
      });
    }
    if (madeOpen.length > 0) {
      await errors.run('leads of stages no longer won', async () => {
        const leadIds = await api.openLeadIdsInStages(madeOpen);

        if (leadIds.length > 0) {
          await api.writeLeads(
            leadIds.map((leadId) => ({ leadId, data: {} })),
            { rescore: true },
          );
        }
      });
    }
    if (events.some((event) => BOARD_FIELDS.some((field) => changed(event, field)))) {
      await errors.run('board columns', () => api.syncBoardGroups());
    }
    errors.throwIfAny();
  };
