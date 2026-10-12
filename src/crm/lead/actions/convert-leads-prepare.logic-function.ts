import { defineLogicFunction } from 'twenty-sdk/define';

import { findPendingDuplicates, readLeadsLeftInPlay } from 'src/crm/lead/actions/convert-many';
import { optionalId, optionalIds } from 'src/crm/lead/actions/convert-lead-shared';
import { CONVERT_MESSAGES } from 'src/crm/lead/actions/convert-messages.constant';
import { LeadActionError } from 'src/crm/lead/actions/lead-action-error';
import { leadRouteHandler, readCurrentMemberId, readLeadIds } from 'src/crm/lead/actions/lead-action-route';
import {
  CONVERT_LEADS_PREPARE_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  CONVERT_LEADS_PREPARE_ROUTE_PATH,
} from 'src/crm/lead/actions/lead-actions-universal-identifiers.constant';
import { planMassTeam } from 'src/crm/lead/actions/utils/plan-mass-convert.util';
import { loadLeadContext } from 'src/crm/lead/load-lead-context';
import { type LeadRow } from 'src/crm/lead/types/lead-row.type';

// Each selected lead whose search finds two pending leads or more, with the
// leads found. Some may lie outside the selection; a lost or won selected
// lead is not among its own.
const duplicateGroups = async (leads: LeadRow[]) => {
  const groups = [];

  for (const lead of leads) {
    const matches = await findPendingDuplicates(lead);

    if (matches.length > 1) {
      groups.push({
        leadId: lead.id,
        leadName: lead.name,
        matches: matches.map((match) => ({ id: match.id, name: match.name, email: match.emailFrom?.primaryEmail ?? null })),
      });
    }
  }

  return groups;
};

// The duplicates are listed when the dialog opens; a change of salespersons
// asks for the team only.
const handler = leadRouteHandler(async (body) => {
  const leadIds = readLeadIds(body);

  if (leadIds.length < 2) {
    throw new LeadActionError(CONVERT_MESSAGES.selectTwo, {}, 400);
  }

  const context = await loadLeadContext([]);
  const teamId = planMassTeam({
    salespersonIds: optionalIds(body.salespersonIds),
    currentUserId: await readCurrentMemberId(),
    teamId: optionalId(body.teamId),
    teams: context.teams,
    memberships: context.memberships,
  });

  return body.withDuplicates === false ? { teamId } : { teamId, groups: await duplicateGroups((await readLeadsLeftInPlay(leadIds)).inPlay) };
});

export default defineLogicFunction({
  universalIdentifier: CONVERT_LEADS_PREPARE_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'convert-leads-prepare',
  description: 'Lists the duplicates of the selected leads and the default team for converting them.',
  timeoutSeconds: 300,
  handler,
  httpRouteTriggerSettings: { path: CONVERT_LEADS_PREPARE_ROUTE_PATH, httpMethod: 'POST', isAuthRequired: true },
});
