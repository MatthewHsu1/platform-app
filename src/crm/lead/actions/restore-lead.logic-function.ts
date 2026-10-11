import { defineLogicFunction, type RoutePayload } from 'twenty-sdk/define';

import {
  applyLeadUpdate,
  findLead,
  readLeadId,
  withLeadRouteErrors,
} from 'src/crm/lead/actions/lead-action-route';
import {
  RESTORE_LEAD_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  RESTORE_LEAD_ROUTE_PATH,
} from 'src/crm/lead/actions/lead-actions-universal-identifiers.constant';
import { planRestore } from 'src/crm/lead/actions/utils/plan-won-lost.util';
import { jsonResponse, readBody } from 'src/shared/route-response';

const handler = async (payload: RoutePayload) => {
  const leadId = readLeadId(readBody(payload));

  if (leadId === null) {
    return jsonResponse(400, { error: 'leadId is required.' });
  }

  const lead = await findLead<{ wonStatus: string | null }>(leadId, 'wonStatus');

  if (lead === null) {
    return jsonResponse(404, { error: 'Lead not found.' });
  }

  return applyLeadUpdate(leadId, planRestore({ wonStatus: lead.wonStatus }));
};

export default defineLogicFunction({
  universalIdentifier: RESTORE_LEAD_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'restore-lead',
  description: 'Puts a lost lead back into the pipeline.',
  timeoutSeconds: 30,
  handler: withLeadRouteErrors(handler),
  httpRouteTriggerSettings: {
    path: RESTORE_LEAD_ROUTE_PATH,
    httpMethod: 'POST',
    isAuthRequired: true,
  },
});
