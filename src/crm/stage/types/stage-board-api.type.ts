import { type StageRow } from 'src/crm/lead/types/stage-row.type';

export type StageBoardApi = {
  listStages: () => Promise<StageRow[]>;
  listStageBoards: () => Promise<{ id: string }[]>;
  listGroups: (viewId: string) => Promise<{ id: string; fieldValue: string | null; position: number }[]>;
  createGroup: (viewId: string, fieldValue: string, position: number) => Promise<void>;
  moveGroup: (groupId: string, position: number) => Promise<void>;
  destroyGroup: (groupId: string) => Promise<void>;
};
