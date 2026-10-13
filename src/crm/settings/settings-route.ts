import { type RoutePayload } from 'twenty-sdk/define';

import { withLeadRouteErrors } from 'src/crm/lead/actions/lead-action-route';
import { readUserLocale } from 'src/shared/i18n/read-user-locale';
import { type jsonResponse } from 'src/shared/route-response';

type RouteResponse = ReturnType<typeof jsonResponse>;

// A settings route answers in the clicking user's language; a role refusal
// and any other failure answer as every lead route does.
export const settingsRoute = (run: (payload: RoutePayload, locale: string) => Promise<RouteResponse>) =>
  withLeadRouteErrors(async (payload) => run(payload, await readUserLocale().catch(() => 'en')));
