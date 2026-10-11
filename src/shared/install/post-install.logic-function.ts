import { definePostInstallLogicFunction, type InstallPayload } from 'twenty-sdk/define';

import { POST_INSTALL_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import { BASE_INSTALL } from 'src/base/base-install';
import { CRM_INSTALL } from 'src/crm/crm-install';
import { finishCrmInstall } from 'src/crm/finish-crm-install';
import { CRM_STAGE_INSTALL } from 'src/crm/stage/crm-stage-install';
import { syncStageBoardGroups } from 'src/crm/stage/stage-board-groups';
import { PRODUCT_INSTALL } from 'src/product/product-install';
import { ROUTING_INSTALL } from 'src/stock/routing-install';
import { STOCK_INSTALL } from 'src/stock/stock-install';
import { STOCK_PICKING_BATCH_INSTALL } from 'src/stock-picking-batch/stock-picking-batch-install';
import { finishStockInstall } from 'src/stock/stock-post-install';
import { fillPickingTypeCodes } from 'src/stock/picking/fill-picking-type-codes';
import { recomputePickingTypeNames } from 'src/stock/picking-type/recompute-picking-type-names';
import { trimIndexViews } from 'src/shared/install/trim-index-views';
import { twentyInstallApi } from 'src/shared/install/twenty-install-api';
import { runInstall } from 'src/shared/install/utils/run-install.util';
import { UOM_INSTALL } from 'src/uom/uom-install';
import { UTM_INSTALL } from 'src/utm/utm-install';

// The hook may run 300 s and hiding one list column takes about a second, so the column trim
// stops starting new columns after this and the next install goes on.
const TRIM_STOP_AFTER_MS = 180_000;

const handler = async ({ previousVersion }: InstallPayload) => {
  const startedAt = Date.now();
  const { skippedBoards, validationRulesSkipped, skippedViewSorts } = await runInstall({
    api: twentyInstallApi,
    specs: [UTM_INSTALL, CRM_INSTALL, CRM_STAGE_INSTALL, UOM_INSTALL, PRODUCT_INSTALL, BASE_INSTALL, ROUTING_INSTALL, STOCK_INSTALL, STOCK_PICKING_BATCH_INSTALL],
    previousVersion,
  });
  await finishStockInstall(previousVersion);
  const warnings: string[] = [];

  // Upkeep that runs on every install and upgrade; each step is safe to repeat, and one that fails
  // is retried by the next install instead of stopping this one.
  const upkeep: [string, () => Promise<unknown>][] = [
    ['filling the type of operation on transfers', fillPickingTypeCodes],
    ['filling the full names of operation types', () => recomputePickingTypeNames({})],
    ['drawing the stage columns of the lead boards', syncStageBoardGroups],
    ['finishing the CRM', () => finishCrmInstall(previousVersion)],
    [
      'trimming the columns of the "All" lists',
      async () => {
        const { columnsLeft, listsNotReached } = await trimIndexViews(startedAt + TRIM_STOP_AFTER_MS);

        if (columnsLeft > 0 || listsNotReached > 0) {
          warnings.push(
            `Install: the "All" lists are not all trimmed yet (${columnsLeft} columns still to hide, ${listsNotReached} lists not reached); the next install and the daily job go on.`,
          );
        }
      },
    ],
  ];

  for (const [what, step] of upkeep) {
    try {
      await step();
    } catch (error) {
      warnings.push(`Install: ${what} failed (${error instanceof Error ? error.message : String(error)}). The next install tries again.`);
    }
  }

  for (const { name, reason } of skippedBoards) {
    warnings.push(`Install: board "${name}" was not made (${reason}). Make it by hand.`);
  }

  for (const { objectUniversalIdentifier, reason } of skippedViewSorts) {
    warnings.push(`Install: the main list of ${objectUniversalIdentifier} was not sorted (${reason}).`);
  }

  if (validationRulesSkipped) {
    warnings.push(
      'Install: validation rules were not made; turn on IS_VALIDATION_RULES_ENABLED for this workspace and reinstall.',
    );
  }

  for (const warning of warnings) {
    console.warn(warning);
  }

  return { skippedBoards, validationRulesSkipped, skippedViewSorts, warnings };
};

export default definePostInstallLogicFunction({
  universalIdentifier: POST_INSTALL_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'platform-post-install',
  description:
    'Makes the staff lists, default rows, boards, validation rules and list sorts each module needs, sets the default type of new leads, fills fields that older rows lack, and trims the columns of the "All" lists once. Adds only what is missing.',
  timeoutSeconds: 300,
  handler,
  shouldRunOnVersionUpgrade: true,
  shouldRunSynchronously: true,
});
