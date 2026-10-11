import { type CrmSettings } from 'src/crm/settings/types/crm-settings.type';

// Twenty hands app variables to a logic function as text.
const readBoolean = (name: string, fallback: boolean) => {
  const value = process.env[name];

  if (value === undefined || value === '') {
    return fallback;
  }

  return value === 'true';
};

export const readCrmSettings = async (): Promise<CrmSettings> => ({
  membershipMulti: readBoolean('SALES_TEAM_MEMBERSHIP_MULTI', false),
});
