import { defineLogicFunction } from 'twenty-sdk/define';

import { WON_STATUS } from 'src/crm/crm-options.constant';
import { LeadActionError } from 'src/crm/lead/actions/lead-action-error';
import { leadRouteHandler, readLeadIds, readLeadsAsUser } from 'src/crm/lead/actions/lead-action-route';
import {
  MERGE_LEADS_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  MERGE_LEADS_ROUTE_PATH,
} from 'src/crm/lead/actions/lead-actions-universal-identifiers.constant';
import { MERGE_MESSAGES } from 'src/crm/lead/merge/merge-messages.constant';
import { mergeLeads } from 'src/crm/lead/merge/merge-leads';

const optionalId = (value: unknown) => (typeof value === 'string' && value.length > 0 ? value : null);

// Won leads are left out of a merge; what remains must be two to five leads.
const handler = leadRouteHandler(async (body) => {
  const leads = await readLeadsAsUser(readLeadIds(body));
  const toMerge = leads.filter((lead) => lead.wonStatus !== WON_STATUS.WON).map((lead) => lead.id);

  if (toMerge.length < 2) {
    throw new LeadActionError(MERGE_MESSAGES.tooFewWithoutWon);
  }

  const { headId } = await mergeLeads(toMerge, {
    salespersonId: optionalId(body.salespersonId),
    teamId: optionalId(body.teamId),
    caller: 'person',
  });

  return { leadId: headId };
});

export default defineLogicFunction({
  universalIdentifier: MERGE_LEADS_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'merge-leads',
  description: 'Merges two to five leads into the one most likely to be won and puts the others in the trash.',
  timeoutSeconds: 300,
  handler,
  httpRouteTriggerSettings: { path: MERGE_LEADS_ROUTE_PATH, httpMethod: 'POST', isAuthRequired: true },
});
