import { type RoutePayload } from 'twenty-sdk/define';
import { Response } from 'twenty-sdk/logic-function';

import { type LeadUpdatePlan } from 'src/crm/lead/actions/utils/plan-won-lost.util';
import { describeGraphqlErrors, twentyGraphql } from 'src/shared/twenty-graphql';

export const jsonResponse = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

export const readBody = (payload: RoutePayload) =>
  (payload.body ?? {}) as Record<string, unknown>;

export const readLeadId = (body: Record<string, unknown>) =>
  typeof body.leadId === 'string' && body.leadId.length > 0 ? body.leadId : null;

// Reads as the clicking user, so a lead their row rule hides is "not found".
export const findLead = async <TLead>(leadId: string, selection: string) => {
  const found = await twentyGraphql<{ crmLead: TLead | null }>(
    'person',
    `query LeadForAction($id: UUID!) {
      crmLead(filter: { id: { eq: $id } }) { ${selection} }
    }`,
    { id: leadId },
  );

  return found.data?.crmLead ?? null;
};

export const applyLeadUpdate = async (leadId: string, plan: LeadUpdatePlan) => {
  if (plan.kind === 'refuse') {
    return jsonResponse(409, { error: plan.reason });
  }

  const updated = await twentyGraphql<{ updateCrmLead: { id: string } | null }>(
    'person',
    `mutation UpdateLeadForAction($id: UUID!, $data: CrmLeadUpdateInput!) {
      updateCrmLead(id: $id, data: $data) { id }
    }`,
    { id: leadId, data: plan.data },
  );

  if (!updated.data?.updateCrmLead) {
    return jsonResponse(500, {
      error: `Could not update the lead: ${describeGraphqlErrors(updated.errors)}`,
    });
  }

  return jsonResponse(200, { leadId });
};
