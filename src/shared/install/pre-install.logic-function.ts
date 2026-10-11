import { definePreInstallLogicFunction, type InstallPayload } from 'twenty-sdk/define';

import { PRE_INSTALL_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import { dropOldStageField } from 'src/crm/stage/drop-old-stage-field';
import { TWENTY_PRE_INSTALL_API } from 'src/shared/install/twenty-pre-install-api';

const handler = async ({ previousVersion }: InstallPayload) => ({
  oldStageField: await dropOldStageField({ api: TWENTY_PRE_INSTALL_API, previousVersion }),
});

export default definePreInstallLogicFunction({
  universalIdentifier: PRE_INSTALL_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'platform-pre-install',
  description: 'Removes data-model parts an upgrade replaces under the same name, before the new ones are made.',
  timeoutSeconds: 120,
  handler,
  shouldRunOnVersionUpgrade: true,
});
