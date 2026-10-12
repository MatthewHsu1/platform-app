import { defineLogicFunction } from 'twenty-sdk/define';

import { LEAD_TYPE, WON_STATUS } from 'src/crm/crm-options.constant';
import { convertAndAllocate } from 'src/crm/lead/actions/convert-and-allocate';
import { currentAutomatedProbability } from 'src/crm/lead/actions/current-automated-probability';
import {
  optionalId,
  planMergedHead,
  refuseUnconvertible,
  requireCustomerRights,
  resolveConvertDefaults,
} from 'src/crm/lead/actions/convert-lead-shared';
import { CONVERT_MESSAGES } from 'src/crm/lead/actions/convert-messages.constant';
import { LeadActionError } from 'src/crm/lead/actions/lead-action-error';
import {
  leadRouteHandler,
  readLeadId,
  readLeadsAsUser,
  SELECT_ONE_LEAD,
  updateLeadAsUser,
} from 'src/crm/lead/actions/lead-action-route';
import {
  CONVERT_LEAD_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  CONVERT_LEAD_ROUTE_PATH,
} from 'src/crm/lead/actions/lead-actions-universal-identifiers.constant';
import { type ConvertOptions } from 'src/crm/lead/actions/types/convert-options.type';
import { planRestore } from 'src/crm/lead/actions/utils/plan-won-lost.util';
import { type CustomerAction } from 'src/crm/lead/actions/utils/types/customer-action.type';
import { loadLeadContext } from 'src/crm/lead/load-lead-context';
import { mergeLeads } from 'src/crm/lead/merge/merge-leads';
import { writeLeadsAsApplication } from 'src/crm/lead/write-leads-as-application';
import { randomId } from 'src/shared/utils/random-id.util';

// A merge cannot be undone: when the kept lead will need a new customer, the
// user's right to make one is checked before the merge, not after it. Only a
// lead is converted after the merge; an opportunity keeps its customer.
const requireHeadCustomerRights = async (mergeIds: string[], options: ConvertOptions) => {
  const { stages } = await loadLeadContext([]);
  const head = planMergedHead(await readLeadsAsUser(mergeIds), stages);

  if (head !== null && head.leadType === LEAD_TYPE.LEAD) {
    // A company name on the kept lead counts as a company to create, even when one of that name exists.
    await requireCustomerRights([head], options);
  }
};

const handler = leadRouteHandler(async (body) => {
  const leadId = readLeadId(body);

  if (leadId === null) {
    throw new LeadActionError(SELECT_ONE_LEAD, {}, 400);
  }

  const [lead] = await readLeadsAsUser([leadId]);

  refuseUnconvertible(lead);

  const customerAction: CustomerAction = body.customerAction === 'EXIST' ? 'EXIST' : 'CREATE';
  const personId = optionalId(body.personId);
  const salespersonId = optionalId(body.salespersonId);
  const teamId = optionalId(body.teamId);
  const force = body.force !== false;
  // Without the dialog's run id (a call from outside the dialog) a repeat makes its customer again.
  const options: ConvertOptions = {
    customerAction,
    personId,
    companyId: optionalId(body.companyId),
    salespersonIds: salespersonId === null ? [] : [salespersonId],
    teamId,
    force,
    runId: optionalId(body.runId) ?? randomId(),
  };

  if (customerAction === 'EXIST' && personId === null && lead.personId === null && lead.companyId === null) {
    throw new LeadActionError(CONVERT_MESSAGES.chooseContact, {}, 400);
  }

  if (body.conversion !== 'MERGE') {
    await convertAndAllocate([lead], options);

    return { leadId };
  }

  const { duplicates } = await resolveConvertDefaults(lead, { customerAction, personId });
  const mergeIds = [...new Set([leadId, ...duplicates.map((duplicate) => duplicate.id)])];

  await requireHeadCustomerRights(mergeIds, options);

  const { headId } = await mergeLeads(mergeIds, { caller: 'person' });
  let [head] = await readLeadsAsUser([headId]);

  // A lost lead kept by the merge comes back into the pipeline, as Restore brings it back.
  if (head.wonStatus === WON_STATUS.LOST) {
    const restore = planRestore({
      wonStatus: head.wonStatus,
      storedAutomated: head.automatedProbability,
      newAutomated: await currentAutomatedProbability(head),
    });

    if (restore.kind === 'update') {
      if (restore.appData !== null) {
        await writeLeadsAsApplication([{ leadId: headId, data: restore.appData }]);
      }
      await updateLeadAsUser(headId, restore.userData);
    }
    [head] = await readLeadsAsUser([headId]);
  }

  if (head.leadType === LEAD_TYPE.LEAD) {
    await convertAndAllocate([head], options);
  } else if (head.salespersonId === null || force) {
    await updateLeadAsUser(headId, { salespersonId, teamId });
  }

  return { leadId: headId };
});

export default defineLogicFunction({
  universalIdentifier: CONVERT_LEAD_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'convert-lead',
  description: 'Converts a lead into an opportunity, or merges it with its duplicates, and assigns it.',
  timeoutSeconds: 300,
  handler,
  httpRouteTriggerSettings: { path: CONVERT_LEAD_ROUTE_PATH, httpMethod: 'POST', isAuthRequired: true },
});
