export type FillCampaignStagesApi = {
  // Archived campaigns too; not those in the trash.
  campaignIdsWithoutStage: () => Promise<string[]>;
  firstStageId: () => Promise<string | null>;
  setStage: (campaignIds: string[], stageId: string) => Promise<void>;
};
