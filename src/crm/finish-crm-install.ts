import { setLeadTypeDefault } from 'src/crm/lead/set-lead-type-default';

// CRM steps after every install and upgrade, each safe to repeat. The app has
// no switch for qualifying leads first, so new records start as opportunities.
export const finishCrmInstall = async (_previousVersion: string | undefined): Promise<void> => {
  await setLeadTypeDefault(false);
};
