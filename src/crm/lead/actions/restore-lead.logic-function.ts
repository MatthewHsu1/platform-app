import { defineLogicFunction } from 'twenty-sdk/define';

import { CRM_LEAD_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/crm/crm-universal-identifiers.constant';
import { currentAutomatedProbability } from 'src/crm/lead/actions/current-automated-probability';
import { LeadActionError } from 'src/crm/lead/actions/lead-action-error';
import {
  leadRouteHandler,
  readLeadId,
  readLeadsAsUser,
  SELECT_ONE_LEAD,
  updateLeadAsUser,
} from 'src/crm/lead/actions/lead-action-route';
import {
  RESTORE_LEAD_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  RESTORE_LEAD_ROUTE_PATH,
} from 'src/crm/lead/actions/lead-actions-universal-identifiers.constant';
import { planRestore } from 'src/crm/lead/actions/utils/plan-won-lost.util';
import { writeLeadsAsApplication } from 'src/crm/lead/write-leads-as-application';
import { requireUpdateRights } from 'src/shared/object-rights';

// The fresh automated probability is the app's; the status, reason and
// probability go in as the clicking user, so the save rules decide the
// closed date.
const handler = leadRouteHandler(async (body) => {
  const leadId = readLeadId(body);

  if (leadId === null) {
    throw new LeadActionError(SELECT_ONE_LEAD, {}, 400);
  }
  const [lead] = await readLeadsAsUser([leadId]);
  const plan = planRestore({
    wonStatus: lead.wonStatus,
    storedAutomated: lead.automatedProbability,
    newAutomated: await currentAutomatedProbability(lead),
  });

  if (plan.kind === 'refuse') {
    throw new LeadActionError(plan.reason);
  }
  await requireUpdateRights([CRM_LEAD_OBJECT_UNIVERSAL_IDENTIFIER]);
  if (plan.appData !== null) {
    await writeLeadsAsApplication([{ leadId, data: plan.appData }]);
  }
  await updateLeadAsUser(leadId, plan.userData);

  return { leadId };
});

export default defineLogicFunction({
  universalIdentifier: RESTORE_LEAD_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'restore-lead',
  description: 'Puts a lost lead back into the pipeline at its automatic probability.',
  timeoutSeconds: 60,
  handler,
  httpRouteTriggerSettings: {
    path: RESTORE_LEAD_ROUTE_PATH,
    httpMethod: 'POST',
    isAuthRequired: true,
  },
});
