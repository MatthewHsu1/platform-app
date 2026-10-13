import { useCallback, useEffect, useState } from 'react';

import { READ_CRM_SETTINGS_ROUTE_PATH } from 'src/crm/settings/crm-settings-universal-identifiers.constant';
import { type CrmSettingsPageData } from 'src/crm/settings/types/crm-settings-page-data.type';
import { describeRouteError } from 'src/shared/describe-route-error';
import { postAppRoute } from 'src/shared/front-components/post-app-route';

type State = { kind: 'loading' } | { kind: 'error'; message: string } | { kind: 'ready'; data: CrmSettingsPageData };

// The settings as stored, read again after each save.
export const useCrmSettings = (fallbackError: string) => {
  const [state, setState] = useState<State>({ kind: 'loading' });

  const load = useCallback(async () => {
    try {
      setState({ kind: 'ready', data: await postAppRoute<CrmSettingsPageData>(READ_CRM_SETTINGS_ROUTE_PATH, {}) });
    } catch (error) {
      setState({ kind: 'error', message: describeRouteError(error, fallbackError) });
    }
  }, [fallbackError]);

  useEffect(() => {
    void load();
  }, [load]);

  return { state, reload: load };
};
