import { defineLogicFunction, type RoutePayload } from 'twenty-sdk/define';

import { applyLeadUpdate, findLead, readLeadId, withLeadRouteErrors } from 'src/crm/lead/actions/lead-action-route';
import {
  MARK_WON_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  MARK_WON_ROUTE_PATH,
} from 'src/crm/lead/actions/lead-actions-universal-identifiers.constant';
import { planMarkWon } from 'src/crm/lead/actions/utils/plan-won-lost.util';
import { leadSelection, readLeadRow } from 'src/crm/lead/lead-selection';
import { loadLeadContext } from 'src/crm/lead/load-lead-context';
import { readUserLocale } from 'src/shared/i18n/read-user-locale';
import { translate } from 'src/shared/i18n/translate';
import { jsonResponse, readBody } from 'src/shared/route-response';

// Reads the lead as the clicking user and writes with their token, so the
// lead's save rules run in the trigger as for a board drag. The stages are
// read with the app token: every user may pick any stage.
const handler = async (payload: RoutePayload) => {
  const locale = await readUserLocale();
  const leadId = readLeadId(readBody(payload));

  if (leadId === null) {
    return jsonResponse(400, { error: translate(locale, 'leadId is required.') });
  }
  const found = await findLead<Record<string, unknown>>(leadId, leadSelection({ withTeam: true }));

  if (found === null) {
    return jsonResponse(404, { error: translate(locale, 'Lead not found.') });
  }
  const lead = readLeadRow(found);
  const { stages } = await loadLeadContext([lead]);
  const plan = planMarkWon({ lead, stages });

  return applyLeadUpdate(leadId, plan.kind === 'refuse' ? { ...plan, reason: translate(locale, plan.reason) } : plan);
};

export default defineLogicFunction({
  universalIdentifier: MARK_WON_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'mark-lead-won',
  description: 'Marks an opportunity won: moves it to the won stage that fits its sales team, at 100 %.',
  timeoutSeconds: 60,
  handler: withLeadRouteErrors(handler),
  httpRouteTriggerSettings: {
    path: MARK_WON_ROUTE_PATH,
    httpMethod: 'POST',
    isAuthRequired: true,
  },
});
