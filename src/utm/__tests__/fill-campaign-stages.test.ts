import { describe, expect, it } from 'vitest';

import { makeFillCampaignStages } from 'src/utm/fill-campaign-stages';

const makeFake = (withoutStage: string[], firstStageId: string | null) => {
  const calls: string[] = [];

  return {
    calls,
    fill: makeFillCampaignStages({
      campaignIdsWithoutStage: async () => {
        calls.push('read campaigns');
        return withoutStage;
      },
      firstStageId: async () => firstStageId,
      setStage: async (campaignIds, stageId) => {
        calls.push(`set stage ${stageId} on ${campaignIds.join(',')}`);
      },
    }),
  };
};

describe('fillCampaignStages', () => {
  it('puts the campaigns without a stage in the first stage on the upgrade that brings stages', async () => {
    const { calls, fill } = makeFake(['spring', 'archived-winter'], 'new');

    await fill('2.3.2');

    expect(calls).toEqual(['read campaigns', 'set stage new on spring,archived-winter']);
  });

  it('does nothing on a later install, so a stage staff chose is never replaced', async () => {
    const { calls, fill } = makeFake(['spring'], 'new');

    await fill('2.4.0');
    await fill('2.5.1');

    expect(calls).toEqual([]);
  });

  it('writes nothing when every campaign has a stage', async () => {
    const { calls, fill } = makeFake([], 'new');

    await fill('2.2.0');

    expect(calls).toEqual(['read campaigns']);
  });
});
