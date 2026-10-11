import { defineLogicFunction } from 'twenty-sdk/define';

import { destroyDeletedLinksHandler } from 'src/shared/triggers/destroy-deleted-links';
import { records } from 'src/shared/triggers/records';
import { UTM_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS } from 'src/utm/utm-universal-identifiers.constant';

export default defineLogicFunction({
  universalIdentifier: UTM_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS.utmCampaignTag,
  name: 'platform-utm-campaign-tag',
  description: 'Removes a campaign tag link for good once it is deleted, so the same link can be made again.',
  timeoutSeconds: 60,
  handler: destroyDeletedLinksHandler(records('utmCampaignTag', 'utmCampaignTags')),
  databaseEventTriggerSettings: { eventName: 'utmCampaignTag.*', batchMode: true },
});
