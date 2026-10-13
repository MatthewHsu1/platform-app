import { isNewModule } from 'src/shared/install/utils/run-install.util';
import { records } from 'src/shared/triggers/records';
import { type FillCampaignStagesApi } from 'src/utm/types/fill-campaign-stages-api.type';
import { TWENTY_UTM_TRIGGER_API } from 'src/utm/twenty-utm-api';
import { UTM_STAGE_INSTALL } from 'src/utm/utm-install';

const campaigns = records('utmCampaign', 'utmCampaigns');

const TWENTY_FILL_CAMPAIGN_STAGES_API: FillCampaignStagesApi = {
  campaignIdsWithoutStage: async () => (await campaigns.find<{ id: string }>({ stageId: { is: 'NULL' } }, 'id')).map(({ id }) => id),
  firstStageId: TWENTY_UTM_TRIGGER_API.firstStageId,
  setStage: (campaignIds, stageId) => campaigns.updateMany(campaignIds, { stageId }),
};

// Campaigns made before campaign stages existed have none. The first install
// of the version that brings stages puts them, archived ones too, in the first
// stage. Their responsible stays empty for staff to fill: the install runs for
// no user. Runs after the install made the default stage.
export const makeFillCampaignStages = (api: FillCampaignStagesApi) => async (previousVersion: string | undefined) => {
  if (!isNewModule(previousVersion, UTM_STAGE_INSTALL.firstVersion)) {
    return;
  }

  const campaignIds = await api.campaignIdsWithoutStage();
  const stageId = campaignIds.length === 0 ? null : await api.firstStageId();

  if (stageId !== null) {
    await api.setStage(campaignIds, stageId);
  }
};

export const fillCampaignStages = makeFillCampaignStages(TWENTY_FILL_CAMPAIGN_STAGES_API);
