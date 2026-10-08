import { definePostInstallLogicFunction, type InstallPayload } from 'twenty-sdk/define';

import { POST_INSTALL_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import { CRM_INSTALL } from 'src/crm/crm-install';
import { PRODUCT_INSTALL } from 'src/product/product-install';
import { twentyInstallApi } from 'src/shared/install/twenty-install-api';
import { runInstall } from 'src/shared/install/utils/run-install.util';
import { UOM_INSTALL } from 'src/uom/uom-install';
import { UTM_INSTALL } from 'src/utm/utm-install';

const handler = async ({ previousVersion }: InstallPayload) => {
  const { skippedBoards, validationRulesSkipped } = await runInstall({
    api: twentyInstallApi,
    specs: [UTM_INSTALL, CRM_INSTALL, UOM_INSTALL, PRODUCT_INSTALL],
    previousVersion,
  });

  for (const { name, reason } of skippedBoards) {
    console.warn(`Install: board "${name}" was not made (${reason}). Make it by hand.`);
  }

  if (validationRulesSkipped) {
    console.warn(
      'Install: validation rules were not made; turn on IS_VALIDATION_RULES_ENABLED for this workspace and reinstall.',
    );
  }

  return { skippedBoards, validationRulesSkipped };
};

export default definePostInstallLogicFunction({
  universalIdentifier: POST_INSTALL_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'platform-post-install',
  description:
    'Makes the staff lists, default rows and boards each module needs. Adds only what is missing.',
  timeoutSeconds: 120,
  handler,
  shouldRunOnVersionUpgrade: true,
  shouldRunSynchronously: true,
});
