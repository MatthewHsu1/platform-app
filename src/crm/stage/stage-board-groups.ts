import { TWENTY_STAGE_BOARD_API } from 'src/crm/stage/twenty-stage-board-api';
import { type StageBoardApi } from 'src/crm/stage/types/stage-board-api.type';
import { planStageGroups } from 'src/crm/stage/utils/plan-stage-groups.util';
import { claimKey, withClaim } from 'src/shared/claims/claim';
import { type ClaimKey } from 'src/shared/claims/types/claim-key.type';

type RunAlone = (key: ClaimKey, run: () => Promise<void>) => Promise<{ kind: 'done' } | { kind: 'held' }>;

const BOARD_COLUMNS_KEY = claimKey('stageBoardColumns', 'crmLead');
const ATTEMPTS = 6;
const WAIT_MS = 1_000;

// The only writer of the stage columns on lead boards, the install's too. Every board of leads grouped by stage
// keeps one column per stage, also the boards staff make. Two runs at once would each add a missing column, so
// one runs at a time; a run that finds another going waits for it, then reads the columns afresh.
export const makeSyncStageBoardGroups =
  (api: StageBoardApi, runAlone: RunAlone, wait: (attempt: number) => Promise<void>) => async () => {
    const sync = async () => {
      const stages = await api.listStages();

      for (const board of await api.listStageBoards()) {
        const plan = planStageGroups({ stages, groups: await api.listGroups(board.id) });

        for (const group of plan.create) {
          await api.createGroup(board.id, group.fieldValue, group.position);
        }
        for (const group of plan.update) {
          await api.moveGroup(group.id, group.position);
        }
        for (const groupId of plan.remove) {
          await api.destroyGroup(groupId);
        }
      }
    };

    for (let attempt = 1; attempt <= ATTEMPTS; attempt += 1) {
      if ((await runAlone(BOARD_COLUMNS_KEY, sync)).kind === 'done') {
        return;
      }
      await wait(attempt);
    }
    throw new Error('The board columns are being redrawn by another run; the next stage change redraws them again.');
  };

export const syncStageBoardGroups = makeSyncStageBoardGroups(
  TWENTY_STAGE_BOARD_API,
  (key, run) => withClaim(key, run),
  (attempt) => new Promise((resolve) => setTimeout(resolve, attempt * WAIT_MS)),
);
