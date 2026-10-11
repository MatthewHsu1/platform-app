import { type RoutePayload } from 'twenty-sdk/define';

import { type LeadUpdatePlan } from 'src/crm/lead/actions/utils/types/lead-update-plan.type';
import { readUserLocale } from 'src/shared/i18n/read-user-locale';
import { notAllowedResponse } from 'src/shared/not-allowed';
import { jsonResponse } from 'src/shared/route-response';
import { GraphqlForbiddenError, requireData, twentyGraphql } from 'src/shared/twenty-graphql';

type RouteResponse = ReturnType<typeof jsonResponse>;

export const readLeadId = (body: Record<string, unknown>) =>
  typeof body.leadId === 'string' && body.leadId.length > 0 ? body.leadId : null;

// Reads as the clicking user, so a lead their row rule hides is "not found". A read their role refuses, or
// one that fails, throws instead.
export const findLead = async <TLead>(leadId: string, selection: string) =>
  requireData(
    await twentyGraphql<{ crmLead: TLead | null }>(
      'person',
      `query LeadForAction($id: UUID!) {
        crmLead(filter: { id: { eq: $id } }) { ${selection} }
      }`,
      { id: leadId },
    ),
    'Read the lead',
  ).crmLead;

export const applyLeadUpdate = async (leadId: string, plan: LeadUpdatePlan) => {
  if (plan.kind === 'refuse') {
    return jsonResponse(409, { error: plan.reason });
  }

  requireData(
    await twentyGraphql<{ updateCrmLead: { id: string } | null }>(
      'person',
      `mutation UpdateLeadForAction($id: UUID!, $data: CrmLeadUpdateInput!) {
        updateCrmLead(id: $id, data: $data) { id }
      }`,
      { id: leadId, data: plan.data },
    ),
    'Update the lead',
  );

  return jsonResponse(200, { leadId });
};

// A read or write the user's role does not allow answers 409 with a plain sentence; any other failure 500.
export const makeLeadRouteErrors =
  (readLocale: () => Promise<string>) =>
  (handler: (payload: RoutePayload) => Promise<RouteResponse>) =>
  async (payload: RoutePayload) => {
    try {
      return await handler(payload);
    } catch (error) {
      if (error instanceof GraphqlForbiddenError) {
        return notAllowedResponse(await readLocale().catch(() => 'en'), error);
      }

      return jsonResponse(500, { error: error instanceof Error ? error.message : String(error) });
    }
  };

export const withLeadRouteErrors = makeLeadRouteErrors(readUserLocale);
