import { definePostInstallLogicFunction, type InstallPayload } from 'twenty-sdk/define';

import { POST_INSTALL_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import { BASE_INSTALL } from 'src/base/base-install';
import { BASE_TERRITORY_INSTALL } from 'src/base-territory/base-territory-install';
import { CRM_INSTALL } from 'src/crm/crm-install';
import { finishCrmInstall } from 'src/crm/finish-crm-install';
import { CRM_SCREENS_INSTALL } from 'src/crm/crm-screens-install';
import { CRM_STAGE_INSTALL } from 'src/crm/stage/crm-stage-install';
import { FIELDSERVICE_INSTALL } from 'src/fieldservice/fieldservice-install';
import { FIELDSERVICE_SCREENS_INSTALL } from 'src/fieldservice/fieldservice-screens-install';
import { syncStageBoardGroups } from 'src/crm/stage/stage-board-groups';
import { ensureCasesBoardNavigationItem } from 'src/helpdesk/ensure-cases-board-navigation-item';
import { HELPDESK_INSTALL } from 'src/helpdesk/helpdesk-install';
import { HELPDESK_SCREENS_INSTALL } from 'src/helpdesk/helpdesk-screens-install';
import { syncCaseBoardGroups } from 'src/helpdesk/stage/sync-case-board-groups';
import { HELPDESK_SLA_INSTALL } from 'src/helpdesk-sla/helpdesk-sla-install';
import { RESOURCE_INSTALL } from 'src/resource/resource-install';
import { PRODUCT_INSTALL } from 'src/product/product-install';
import { SALES_TEAM_INSTALL } from 'src/sales-team/sales-team-install';
import { ROUTING_INSTALL } from 'src/stock/routing-install';
import { STOCK_INSTALL } from 'src/stock/stock-install';
import { STOCK_PICKING_BATCH_INSTALL } from 'src/stock-picking-batch/stock-picking-batch-install';
import { finishStockInstall } from 'src/stock/stock-post-install';
import { fillPickingTypeCodes } from 'src/stock/picking/fill-picking-type-codes';
import { recomputePickingTypeNames } from 'src/stock/picking-type/recompute-picking-type-names';
import { trimIndexViews } from 'src/shared/install/trim-index-views';
import { twentyInstallApi } from 'src/shared/install/twenty-install-api';
import { syncMixedRolesOnSchedule } from 'src/roles/sync/sync-on-schedule';
import { runInstall } from 'src/shared/install/utils/run-install.util';
import { UOM_INSTALL } from 'src/uom/uom-install';
import { fillCampaignStages } from 'src/utm/fill-campaign-stages';
import { UTM_INSTALL, UTM_STAGE_INSTALL } from 'src/utm/utm-install';

// The hook may run 300 s and hiding one list column takes about a second, so the column trim
// stops starting new columns after this and the next install goes on.
const TRIM_STOP_AFTER_MS = 180_000;

const handler = async ({ previousVersion }: InstallPayload) => {
  const startedAt = Date.now();
  const { skippedBoards, validationRulesSkipped, skippedViewSorts } = await runInstall({
    api: twentyInstallApi,
    specs: [UTM_INSTALL, UTM_STAGE_INSTALL, CRM_INSTALL, CRM_STAGE_INSTALL, SALES_TEAM_INSTALL, CRM_SCREENS_INSTALL, UOM_INSTALL, PRODUCT_INSTALL, BASE_INSTALL, ROUTING_INSTALL, STOCK_INSTALL, STOCK_PICKING_BATCH_INSTALL, RESOURCE_INSTALL, HELPDESK_INSTALL, HELPDESK_SLA_INSTALL, HELPDESK_SCREENS_INSTALL, BASE_TERRITORY_INSTALL, FIELDSERVICE_INSTALL, FIELDSERVICE_SCREENS_INSTALL],
    previousVersion,
  });
  await finishStockInstall(previousVersion);
  const warnings: string[] = [];

  // Runs on the upgrade to campaign stages only, so a later install cannot make up for it.
  try {
    await fillCampaignStages(previousVersion);
  } catch (error) {
    warnings.push(
      `Install: putting the older campaigns in the first campaign stage failed (${error instanceof Error ? error.message : String(error)}). Set their stage by hand.`,
    );
  }

  // Upkeep that runs on every install and upgrade; each step is safe to repeat, and one that fails
  // is retried by the next install instead of stopping this one.
  const upkeep: [string, () => Promise<unknown>][] = [
    ['filling the type of operation on transfers', fillPickingTypeCodes],
    ['filling the full names of operation types', () => recomputePickingTypeNames({})],
    ['drawing the stage columns of the lead boards', syncStageBoardGroups],
    ['drawing the stage columns of the work case boards', syncCaseBoardGroups],
    ['adding the cases board to the Work cases folder', ensureCasesBoardNavigationItem],
    [
      'finishing the CRM',
      async () => {
        warnings.push(...(await finishCrmInstall(previousVersion, startedAt + TRIM_STOP_AFTER_MS)));
      },
    ],
    [
      'rebuilding the mixed roles and the row rules',
      async () => {
        warnings.push(...(await syncMixedRolesOnSchedule()).warnings);
      },
    ],
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
    'Makes the staff lists, default rows, boards, validation rules and list sorts each module needs, sets the default type of new leads, fills fields that older rows lack (the stage of older campaigns once), and trims the columns of the "All" lists once. Adds only what is missing. Rebuilds the mixed roles from the building blocks and writes the row rules.',
  timeoutSeconds: 300,
  handler,
  shouldRunOnVersionUpgrade: true,
  shouldRunSynchronously: true,
});
