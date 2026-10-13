import { LeadActionError } from 'src/crm/lead/actions/lead-action-error';
import { type LeadUpdatePlan } from 'src/crm/lead/actions/utils/types/lead-update-plan.type';
import { LEADS_NOT_FOUND } from 'src/crm/lead/lead-messages.constant';
import { queryLeads } from 'src/crm/lead/query-leads';
import { type LeadRow } from 'src/crm/lead/types/lead-row.type';
import { readUserLocale } from 'src/shared/i18n/read-user-locale';
import { jsonResponse } from 'src/shared/route-response';
import { hasMemberBehind, makeRouteErrors, makeRouteHandler, NO_MEMBER_DETAIL } from 'src/shared/route-handlers';
import { MUTATION_MAXIMUM_RECORDS } from 'src/shared/triggers/records';
import { type GraphqlResponse, requireData, twentyGraphql } from 'src/shared/twenty-graphql';
import { chunks } from 'src/shared/utils/chunks.util';

export { NO_MEMBER_DETAIL };
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

export const makeLeadRouteErrors = makeRouteErrors;

export const withLeadRouteErrors = makeRouteErrors(readUserLocale, hasMemberBehind);

// A lead refusal answers with the status its error names.
export const makeLeadRouteHandler = (readLocale: () => Promise<string>, memberBehind: () => Promise<boolean>) =>
  makeRouteHandler(readLocale, memberBehind, (error) => (error instanceof LeadActionError ? error.status : 409));

export const leadRouteHandler = makeLeadRouteHandler(readUserLocale, hasMemberBehind);

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
