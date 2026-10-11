import { destroyLinksOf, stillDeletedIds } from 'src/shared/triggers/cascade-restore';
import { records } from 'src/shared/triggers/records';

const stages = records('crmStage', 'crmStages');
const stageTeams = records('crmStageTeam', 'crmStageTeams');

// A deleted stage loses its team links for good: a link row in the trash
// would keep the unique index busy, so it is destroyed, not soft-deleted.
export const cascadeStageDelete = async (stageIds: string[]): Promise<void> => {
  await destroyLinksOf(stageTeams, 'stageId', await stillDeletedIds(stages, stageIds));
};
