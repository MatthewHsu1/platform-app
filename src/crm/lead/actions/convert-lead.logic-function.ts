import { defineLogicFunction } from 'twenty-sdk/define';

import { LEAD_TYPE, WON_STATUS } from 'src/crm/crm-options.constant';
import { convertAndAllocate } from 'src/crm/lead/actions/convert-and-allocate';
import { twentyConvertApi } from 'src/crm/lead/actions/convert-api';
import { currentAutomatedProbability } from 'src/crm/lead/actions/current-automated-probability';
import { optionalId, refuseUnconvertible, resolveConvertDefaults } from 'src/crm/lead/actions/convert-lead-shared';
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
import { planCreateCustomer } from 'src/crm/lead/actions/utils/plan-create-customer.util';
import { planRestore } from 'src/crm/lead/actions/utils/plan-won-lost.util';
import { type CustomerAction } from 'src/crm/lead/actions/utils/types/customer-action.type';
import { mergeLeads } from 'src/crm/lead/merge/merge-leads';
import { planLeadMerge } from 'src/crm/lead/merge/utils/plan-lead-merge.util';
import { loadLeadContext } from 'src/crm/lead/load-lead-context';
import { writeLeadsAsApplication } from 'src/crm/lead/write-leads-as-application';
import { NOT_ALLOWED_MESSAGE } from 'src/shared/not-allowed';
import { UserError } from 'src/shared/user-error';
import { randomId } from 'src/shared/utils/random-id.util';

// A merge cannot be undone: when the kept lead will need a new customer, the
// user's right to make one is checked before the merge, not after it.
const requireHeadCustomerRights = async (mergeIds: string[], options: ConvertOptions) => {
  if (options.customerAction !== 'CREATE' || options.personId !== null) {
    return;
  }
  const leads = await readLeadsAsUser(mergeIds);
  const { stages } = await loadLeadContext([]);
  const plan = planLeadMerge({ leads, stages });
  const head = leads.find((candidate) => candidate.id === plan.headId);
  const merged = head === undefined ? null : { ...head, ...plan.data };

  if (merged === null || merged.leadType !== LEAD_TYPE.LEAD || merged.personId !== null || merged.companyId !== null) {
    return;
  }
  const customer = planCreateCustomer({
    lead: merged,
    chosenCompanyId: options.companyId,
    companyIdByName: null,
    existingCompanyAddress: null,
    salespersonId: options.salespersonIds[0] ?? null,
  });
  const updatable = await twentyConvertApi.updatableObjects();
  const needed = [
    ...(customer.person === null ? [] : (['person'] as const)),
    ...(customer.company !== null && 'create' in customer.company ? (['company'] as const) : []),
  ];

  if (needed.some((object) => !updatable.has(object))) {
    throw new UserError(NOT_ALLOWED_MESSAGE);
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
