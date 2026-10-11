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
  USE_AUTOMATIC_PROBABILITY_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  USE_AUTOMATIC_PROBABILITY_ROUTE_PATH,
} from 'src/crm/lead/actions/lead-actions-universal-identifiers.constant';
import { planUseAutomaticProbability } from 'src/crm/lead/actions/utils/plan-won-lost.util';
import { writeLeadsAsApplication } from 'src/crm/lead/write-leads-as-application';
import { requireUpdateRights } from 'src/shared/object-rights';

// The fresh automated probability is the app's; the probability goes in as the
// clicking user, as if typed.
const handler = leadRouteHandler(async (body) => {
  const leadId = readLeadId(body);

  if (leadId === null) {
    throw new LeadActionError(SELECT_ONE_LEAD, {}, 400);
  }
  const [lead] = await readLeadsAsUser([leadId]);
  const plan = planUseAutomaticProbability({
    wonStatus: lead.wonStatus,
    probability: lead.probability,
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
  universalIdentifier: USE_AUTOMATIC_PROBABILITY_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'use-automatic-probability',
  description: 'Sets the probability of a lead to its automatic probability.',
  timeoutSeconds: 60,
  handler,
  httpRouteTriggerSettings: {
    path: USE_AUTOMATIC_PROBABILITY_ROUTE_PATH,
    httpMethod: 'POST',
    isAuthRequired: true,
  },
});
