import { type AppLeadWrite } from 'src/crm/lead/types/app-lead-write.type';

export type StageTriggerApi = {
  stageIdsUsedByLeads: (stageIds: string[]) => Promise<Set<string>>;
  restoreStage: (stageId: string, reason: string) => Promise<void>;
  openLeadIdsInStages: (stageIds: string[]) => Promise<string[]>;
  writeLeads: (writes: AppLeadWrite[], options?: { rescore?: boolean }) => Promise<unknown>;
  syncBoardGroups: () => Promise<void>;
  cascadeStageDelete: (stageIds: string[]) => Promise<void>;
  recomputeRotting: (stageIds: string[]) => Promise<unknown>;
  memberLocale: (workspaceMemberId: string | undefined) => Promise<string>;
  translate: (locale: string | null, message: string) => string;
};
