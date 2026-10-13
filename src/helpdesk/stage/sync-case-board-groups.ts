import { type CaseBoardApi } from 'src/helpdesk/stage/types/case-board-api.type';
import { TWENTY_CASE_BOARD_API } from 'src/helpdesk/stage/twenty-case-board-api';
import { planCaseBoardGroups } from 'src/helpdesk/stage/utils/plan-case-board-groups.util';
import { claimKey, withClaim } from 'src/shared/claims/claim';
import { type ClaimKey } from 'src/shared/claims/types/claim-key.type';

type RunAlone = (key: ClaimKey, run: () => Promise<void>) => Promise<{ kind: 'done' } | { kind: 'held' }>;

const BOARD_COLUMNS_KEY = claimKey('stageBoardColumns', 'helpdeskTicket');
const ATTEMPTS = 6;
const WAIT_MS = 1_000;

// The only writer of the stage columns on work case boards: every board of cases grouped by stage keeps one
// column per stage, also the boards staff make, and hides the columns of folded stages. Two runs at once would each
// add a missing column, so one runs at a time; a run that finds another going waits for it, then reads the
// columns afresh.
export const makeSyncCaseBoardGroups = (api: CaseBoardApi, runAlone: RunAlone, wait: (attempt: number) => Promise<void>) => async () => {
  const sync = async () => {
    const stages = await api.listStages();

    for (const board of await api.listBoards()) {
      const plan = planCaseBoardGroups({ stages, groups: await api.listGroups(board.id), hideFolded: true });

      for (const group of plan.create) {
        await api.createGroup(board.id, group);
      }
      for (const { id, ...update } of plan.update) {
        await api.updateGroup(id, update);
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

export const syncCaseBoardGroups = makeSyncCaseBoardGroups(
  TWENTY_CASE_BOARD_API,
  (key, run) => withClaim(key, run),
  (attempt) => new Promise((resolve) => setTimeout(resolve, attempt * WAIT_MS)),
);
