import { defineLogicFunction } from 'twenty-sdk/define';

import { optionalIds } from 'src/crm/lead/actions/convert-lead-shared';
import { convertMany } from 'src/crm/lead/actions/convert-many';
import { CONVERT_MESSAGES } from 'src/crm/lead/actions/convert-messages.constant';
import { LeadActionError } from 'src/crm/lead/actions/lead-action-error';
import { leadRouteHandler, readLeadIds } from 'src/crm/lead/actions/lead-action-route';
import {
  CONVERT_LEADS_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  CONVERT_LEADS_ROUTE_PATH,
} from 'src/crm/lead/actions/lead-actions-universal-identifiers.constant';
import { type CustomerAction } from 'src/crm/lead/actions/utils/types/customer-action.type';
import { optionalId } from 'src/shared/utils/optional-id.util';
import { randomId } from 'src/shared/utils/random-id.util';

const CUSTOMER_ACTIONS: CustomerAction[] = ['EACH_EXIST_OR_CREATE', 'CREATE', 'EXIST'];

const handler = leadRouteHandler(async (body) => {
  const leadIds = readLeadIds(body);

  if (leadIds.length < 2) {
    throw new LeadActionError(CONVERT_MESSAGES.selectTwo, {}, 400);
  }

  const customerAction = CUSTOMER_ACTIONS.find((action) => action === body.customerAction) ?? 'EACH_EXIST_OR_CREATE';
  const personId = optionalId(body.personId);

  if (customerAction === 'EXIST' && personId === null) {
    throw new LeadActionError(CONVERT_MESSAGES.chooseContact, {}, 400);
  }

  return convertMany({
    leadIds,
    deduplicate: body.deduplicate !== false,
    customerAction,
    personId,
    salespersonIds: optionalIds(body.salespersonIds),
    teamId: optionalId(body.teamId),
    force: body.force === true,
    // Without the dialog's run id (a call from outside the dialog) a repeat makes its companies again.
    runId: optionalId(body.runId) ?? randomId(),
  });
});

export default defineLogicFunction({
  universalIdentifier: CONVERT_LEADS_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'convert-leads',
  description: 'Merges the duplicates of the selected leads, converts them to opportunities and assigns them.',
  timeoutSeconds: 300,
  handler,
  httpRouteTriggerSettings: { path: CONVERT_LEADS_ROUTE_PATH, httpMethod: 'POST', isAuthRequired: true },
});
