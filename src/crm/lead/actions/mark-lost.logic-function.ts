import { defineLogicFunction } from 'twenty-sdk/define';

import { LeadActionError } from 'src/crm/lead/actions/lead-action-error';
import { leadRouteHandler, readLeadIds, SELECT_SOME_LEADS } from 'src/crm/lead/actions/lead-action-route';
import {
  MARK_LOST_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  MARK_LOST_ROUTE_PATH,
} from 'src/crm/lead/actions/lead-actions-universal-identifiers.constant';
import { markLeadsLost } from 'src/crm/lead/actions/mark-leads-lost';
import { randomId } from 'src/shared/utils/random-id.util';

const textOf = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

const handler = leadRouteHandler(async (body) => {
  const leadIds = readLeadIds(body);

  if (leadIds.length === 0) {
    throw new LeadActionError(SELECT_SOME_LEADS, {}, 400);
  }
  const lostReasonId = textOf(body.lostReasonId);
  const runId = textOf(body.runId);

  // Without the dialog's run id (a call from outside the dialog) a repeat adds its notes again.
  return markLeadsLost({
    leadIds,
    lostReasonId: lostReasonId.length > 0 ? lostReasonId : null,
    closingNote: textOf(body.closingNote),
    runId: runId.length > 0 ? runId : randomId(),
  });
});

export default defineLogicFunction({
  universalIdentifier: MARK_LOST_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'mark-leads-lost',
  description: 'Marks pending or lost leads lost at 0 %, with an optional reason and closing note.',
  timeoutSeconds: 300,
  handler,
  httpRouteTriggerSettings: {
    path: MARK_LOST_ROUTE_PATH,
    httpMethod: 'POST',
    isAuthRequired: true,
  },
});
