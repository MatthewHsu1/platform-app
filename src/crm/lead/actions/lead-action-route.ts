import { type RoutePayload } from 'twenty-sdk/define';

import { LeadActionError } from 'src/crm/lead/actions/lead-action-error';
import { type LeadUpdatePlan } from 'src/crm/lead/actions/utils/types/lead-update-plan.type';
import { LEADS_NOT_FOUND } from 'src/crm/lead/lead-messages.constant';
import { queryLeads } from 'src/crm/lead/query-leads';
import { type LeadRow } from 'src/crm/lead/types/lead-row.type';
import { readUserLocale } from 'src/shared/i18n/read-user-locale';
import { translate } from 'src/shared/i18n/translate';
import { notAllowedResponse } from 'src/shared/not-allowed';
import { jsonResponse, readBody } from 'src/shared/route-response';
import { MUTATION_MAXIMUM_RECORDS } from 'src/shared/triggers/records';
import { GraphqlForbiddenError, type GraphqlResponse, requireData, twentyGraphql } from 'src/shared/twenty-graphql';
import { UserError } from 'src/shared/user-error';
import { chunks } from 'src/shared/utils/chunks.util';

type RouteResponse = ReturnType<typeof jsonResponse>;

export const SELECT_ONE_LEAD = 'Select one lead.';
export const SELECT_SOME_LEADS = 'Select at least one lead.';

export const readLeadIds = (body: Record<string, unknown>) =>
  Array.isArray(body.leadIds)
    ? [...new Set(body.leadIds.filter((id): id is string => typeof id === 'string' && id.length > 0))]
    : [];

// One-lead routes take `leadId`, or the one selected id of a command.
export const readLeadId = (body: Record<string, unknown>) => {
  if (typeof body.leadId === 'string' && body.leadId.length > 0) {
    return body.leadId;
  }
  const leadIds = readLeadIds(body);

  return leadIds.length === 1 ? leadIds[0] : null;
};

// Reads as the clicking user, so a lead their row rule hides is "not found". A read their role refuses, or
// one that fails, throws instead. The list query answers an empty list for a lead that is gone, where the
// one-record query fails with "Record not found".
export const makeFindLead =
  (query: (query: string, variables: Record<string, unknown>) => Promise<GraphqlResponse<{ crmLeads: { edges: { node: unknown }[] } }>>) =>
  async <TLead>(leadId: string, selection: string): Promise<TLead | null> =>
    (requireData(
      await query(
        `query LeadForAction($id: UUID!) {
          crmLeads(filter: { id: { eq: $id } }, first: 1) { edges { node { ${selection} } } }
        }`,
        { id: leadId },
      ),
      'Read the lead',
    ).crmLeads.edges[0]?.node ?? null) as TLead | null;

export const findLead = makeFindLead((query, variables) => twentyGraphql('person', query, variables));

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

// A route that answers its result with 200. A refusal answers with its status
// and its text in the user's language; a role refusal and any other failure
// as every lead route does.
export const makeLeadRouteHandler =
  (readLocale: () => Promise<string>) => (run: (body: Record<string, unknown>) => Promise<Record<string, unknown>>) =>
    makeLeadRouteErrors(readLocale)(async (payload) => {
      try {
        return jsonResponse(200, await run(readBody(payload)));
      } catch (error) {
        if (!(error instanceof UserError)) {
          throw error;
        }
        const locale = await readLocale().catch(() => 'en');

        return jsonResponse(error instanceof LeadActionError ? error.status : 409, {
          ...error.details,
          error: translate(locale, error.message, error.values),
        });
      }
    });

export const leadRouteHandler = makeLeadRouteHandler(readUserLocale);

// In the order given. A lead the user's row rule hides counts as not found,
// and the whole action stops: acting on part of a selection would surprise.
// A route that scores the lead asks for the tags and language as well.
export const readLeadsAsUser = async (leadIds: string[], { withScoringFields = false }: { withScoringFields?: boolean } = {}): Promise<LeadRow[]> => {
  const found = await queryLeads('person', { id: { in: leadIds } }, { withScoringFields });
  const byId = new Map(found.map((lead) => [lead.id, lead]));
  const missing = leadIds.filter((id) => !byId.has(id));

  if (missing.length > 0) {
    throw new LeadActionError(LEADS_NOT_FOUND, { count: missing.length }, 404);
  }

  return leadIds.flatMap((id) => {
    const lead = byId.get(id);

    return lead === undefined ? [] : [lead];
  });
};

// Staff fields go in as the clicking user, so the save rules treat the change
// as the user's.
export const updateLeadsAsUser = async (leadIds: string[], data: Record<string, unknown>) => {
  for (const part of chunks(leadIds, MUTATION_MAXIMUM_RECORDS)) {
    requireData(
      await twentyGraphql(
        'person',
        `mutation UpdateLeadsAsUser($filter: CrmLeadFilterInput!, $data: CrmLeadUpdateInput!) {
          updateCrmLeads(filter: $filter, data: $data) { id }
        }`,
        { filter: { id: { in: part } }, data },
      ),
      'Update leads',
    );
  }
};

export const updateLeadAsUser = async (leadId: string, data: Record<string, unknown>) => {
  if (Object.keys(data).length === 0) {
    return;
  }
  requireData(
    await twentyGraphql(
      'person',
      `mutation UpdateLeadAsUser($id: UUID!, $data: CrmLeadUpdateInput!) {
        updateCrmLead(id: $id, data: $data) { id }
      }`,
      { id: leadId, data },
    ),
    `Update lead ${leadId}`,
  );
};
