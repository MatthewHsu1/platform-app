import { defineLogicFunction, type RoutePayload } from 'twenty-sdk/define';

import {
  applyLeadUpdate,
  findLead,
  jsonResponse,
  readBody,
  readLeadId,
} from 'src/crm/lead/actions/lead-action-route';
import {
  MARK_LOST_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  MARK_LOST_ROUTE_PATH,
} from 'src/crm/lead/actions/lead-actions-universal-identifiers.constant';
import { planMarkLost } from 'src/crm/lead/actions/utils/plan-won-lost.util';

const handler = async (payload: RoutePayload) => {
  const body = readBody(payload);
  const leadId = readLeadId(body);
  const lostReasonId =
    typeof body.lostReasonId === 'string' && body.lostReasonId.length > 0
      ? body.lostReasonId
      : null;

  if (leadId === null) {
    return jsonResponse(400, { error: 'leadId is required.' });
  }

  const lead = await findLead<{ wonStatus: string | null }>(leadId, 'wonStatus');

  if (lead === null) {
    return jsonResponse(404, { error: 'Lead not found.' });
  }

  return applyLeadUpdate(
    leadId,
    planMarkLost({ wonStatus: lead.wonStatus, lostReasonId, now: new Date().toISOString() }),
  );
};

export default defineLogicFunction({
  universalIdentifier: MARK_LOST_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'mark-lead-lost',
  description: 'Marks a lead lost, at 0 %, with an optional reason.',
  timeoutSeconds: 30,
  handler,
  httpRouteTriggerSettings: {
    path: MARK_LOST_ROUTE_PATH,
    httpMethod: 'POST',
    isAuthRequired: true,
  },
});
