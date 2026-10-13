import { type CaseStageRow } from 'src/helpdesk/types/case-stage-row.type';

export type CaseBoardApi = {
  listStages: () => Promise<CaseStageRow[]>;
  // The boards of cases grouped by stage, the one the install made and any staff made.
  listBoards: () => Promise<{ id: string }[]>;
  listGroups: (viewId: string) => Promise<{ id: string; fieldValue: string | null; position: number; isVisible: boolean }[]>;
  createGroup: (viewId: string, group: { fieldValue: string; position: number; isVisible: boolean }) => Promise<void>;
  updateGroup: (groupId: string, update: { position: number; isVisible: boolean }) => Promise<void>;
  destroyGroup: (groupId: string) => Promise<void>;
};
