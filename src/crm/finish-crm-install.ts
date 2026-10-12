import { setLeadTypeDefault } from 'src/crm/lead/set-lead-type-default';
import { readCrmSettings } from 'src/crm/settings/read-crm-settings';
import { writeApplicationVariables } from 'src/crm/settings/write-application-variables';
import { isNewModule } from 'src/shared/install/utils/run-install.util';

const SCORING_FIRST_VERSION = '2.4.0';
const DAY_MS = 24 * 60 * 60 * 1000;

// CRM steps after every install and upgrade, each safe to repeat. The app has
// no switch for qualifying leads first, so new records start as opportunities.
// When scoring first arrives, its counts start from the week before.
export const finishCrmInstall = async (previousVersion: string | undefined): Promise<void> => {
  await setLeadTypeDefault(false);

  if (isNewModule(previousVersion, SCORING_FIRST_VERSION) && (await readCrmSettings()).plsStartDate === null) {
    await writeApplicationVariables({ CRM_PLS_START_DATE: new Date(Date.now() - 8 * DAY_MS).toISOString().slice(0, 10) });
  }
};
