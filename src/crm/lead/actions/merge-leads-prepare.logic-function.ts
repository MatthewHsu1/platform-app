import { defineLogicFunction } from 'twenty-sdk/define';

import { WON_STATUS } from 'src/crm/crm-options.constant';
import { leadRouteHandler, readLeadIds, readLeadsAsUser } from 'src/crm/lead/actions/lead-action-route';
import {
  MERGE_LEADS_PREPARE_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  MERGE_LEADS_PREPARE_ROUTE_PATH,
} from 'src/crm/lead/actions/lead-actions-universal-identifiers.constant';
import { loadLeadContext } from 'src/crm/lead/load-lead-context';
import { sortForMerge } from 'src/crm/lead/merge/utils/plan-lead-merge.util';
import { planMergeTeam } from 'src/crm/lead/merge/utils/plan-merge-team.util';

const optionalId = (value: unknown) => (typeof value === 'string' && value.length > 0 ? value : null);

// The selected leads in merge order with the won ones left out, and the team
// that follows a chosen salesperson.
const handler = leadRouteHandler(async (body) => {
  const leads = await readLeadsAsUser(readLeadIds(body));
  const context = await loadLeadContext([]);
  const stageNames = new Map(context.stages.map((stage) => [stage.id, stage.name]));
  const kept = sortForMerge(
    leads.filter((lead) => lead.wonStatus !== WON_STATUS.WON),
    context.stages,
  );

  return {
    leads: kept.map((lead) => ({
      id: lead.id,
      name: lead.name,
      leadType: lead.leadType,
      stage: lead.stageId === null ? null : (stageNames.get(lead.stageId) ?? null),
      probability: lead.probability,
    })),
    leftOut: leads.filter((lead) => lead.wonStatus === WON_STATUS.WON).map((lead) => ({ id: lead.id, name: lead.name })),
    teamId: planMergeTeam({
      salespersonId: optionalId(body.salespersonId),
      teamId: optionalId(body.teamId),
      teams: context.teams,
      memberships: context.memberships,
    }),
  };
});

export default defineLogicFunction({
  universalIdentifier: MERGE_LEADS_PREPARE_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'merge-leads-prepare',
  description: 'Lists the selected leads in merge order and the team that follows the chosen salesperson.',
  timeoutSeconds: 60,
  handler,
  httpRouteTriggerSettings: { path: MERGE_LEADS_PREPARE_ROUTE_PATH, httpMethod: 'POST', isAuthRequired: true },
});
