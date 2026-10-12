import { ensurePipelineNavigationItem } from 'src/crm/ensure-pipeline-navigation-item';
import { setLeadTypeDefault } from 'src/crm/lead/set-lead-type-default';
import { readCrmSettings } from 'src/crm/settings/read-crm-settings';
import { setRecurringFieldsVisible } from 'src/crm/settings/apply-settings-side-effects';
import { writeApplicationVariables } from 'src/crm/settings/write-application-variables';
import { errorCollector } from 'src/shared/triggers/retry-on-conflict';
import { isNewModule } from 'src/shared/install/utils/run-install.util';

const SCORING_FIRST_VERSION = '2.4.0';
const DAY_MS = 24 * 60 * 60 * 1000;

// CRM steps after every install and upgrade, each safe to repeat. When
// scoring first arrives, its counts start from the week before; that step
// goes first because it is the one a later install cannot make up for. An
// install resets the lead type default to the one in code, so it is set from
// the "Use leads" setting again; the recurring revenue columns of the lead
// views are shown again the same way while that setting is on. The Pipeline
// sidebar item points at a board the install made.
export const finishCrmInstall = async (previousVersion: string | undefined): Promise<void> => {
  const settings = await readCrmSettings();

  if (isNewModule(previousVersion, SCORING_FIRST_VERSION) && settings.plsStartDate === null) {
    await writeApplicationVariables({ CRM_PLS_START_DATE: new Date(Date.now() - 8 * DAY_MS).toISOString().slice(0, 10) });
  }
  await setLeadTypeDefault(settings.useLeads);
  const errors = errorCollector();

  if (settings.useRecurringRevenues) {
    await errors.run('recurring revenue columns', () => setRecurringFieldsVisible(true));
  }
  await errors.run('Pipeline sidebar item', ensurePipelineNavigationItem);
  errors.throwIfAny();
};
