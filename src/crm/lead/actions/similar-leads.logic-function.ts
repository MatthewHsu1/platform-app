import { defineLogicFunction } from 'twenty-sdk/define';

import { LeadActionError } from 'src/crm/lead/actions/lead-action-error';
import { leadRouteHandler, readLeadId, readLeadsAsUser, SELECT_ONE_LEAD } from 'src/crm/lead/actions/lead-action-route';
import {
  SIMILAR_LEADS_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  SIMILAR_LEADS_ROUTE_PATH,
} from 'src/crm/lead/actions/lead-actions-universal-identifiers.constant';
import {
  keepIfRelevant,
  planSimilarLeadQueries,
  SIMILAR_LEADS_PAGE,
  similarCompanyFilter,
} from 'src/crm/lead/actions/utils/plan-similar-lead-queries.util';
import { queryLeads } from 'src/crm/lead/query-leads';
import { type LeadRow } from 'src/crm/lead/types/lead-row.type';
import { requireData, twentyGraphql } from 'src/shared/twenty-graphql';

type PeoplePage = { people: { edges: { node: { id: string } }[]; pageInfo: { hasNextPage: boolean; endCursor: string | null } } };

// The first leads a criterion finds, one more than a relevant criterion may find.
const firstLeadsAsUser = (filter: Record<string, unknown>) => queryLeads('person', filter, { limit: SIMILAR_LEADS_PAGE });

const peopleOfCompany = async (companyId: string) => {
  const ids: string[] = [];
  let after: string | null = null;

  do {
    const page: PeoplePage = requireData(
      await twentyGraphql<PeoplePage>(
        'person',
        `query CompanyPeople($companyId: UUID!, $after: String) {
          people(filter: { companyId: { eq: $companyId } }, first: 200, after: $after) {
            edges { node { id } }
            pageInfo { hasNextPage endCursor }
          }
        }`,
        { companyId, after },
      ),
      'Find the people of the company',
    );

    ids.push(...page.people.edges.map(({ node }) => node.id));
    after = page.people.pageInfo.hasNextPage ? page.people.pageInfo.endCursor : null;
  } while (after !== null);

  return ids;
};

const readContact = async (personId: string) =>
  requireData(
    await twentyGraphql<{ person: { id: string; companyId: string | null } | null }>(
      'person',
      `query SimilarContact($id: UUID!) { person(filter: { id: { eq: $id } }) { id companyId } }`,
      { id: personId },
    ),
    'Read the contact',
  ).person;

// Leads with the same email domain, the same customer company or the same
// phone, lost ones included, counted and listed with the user's rights.
const handler = leadRouteHandler(async (body) => {
  const leadId = readLeadId(body);

  if (leadId === null) {
    throw new LeadActionError(SELECT_ONE_LEAD, {}, 400);
  }

  const [lead] = await readLeadsAsUser([leadId]);
  const person = lead.personId === null ? null : await readContact(lead.personId);
  const queries = planSimilarLeadQueries({ lead, person });
  const found = new Map<string, LeadRow>();
  const add = (rows: LeadRow[]) => rows.forEach((row) => found.set(row.id, row));

  if (queries.email !== null) {
    add(keepIfRelevant(await firstLeadsAsUser(queries.email)));
  }
  if (queries.commercial?.kind === 'company') {
    const { companyId } = queries.commercial;

    add(await queryLeads('person', similarCompanyFilter({ leadId, companyId, peopleIds: await peopleOfCompany(companyId) })));
  } else if (queries.commercial?.kind === 'person') {
    add(await queryLeads('person', queries.commercial.filter));
  }
  if (queries.phone !== null) {
    add(keepIfRelevant(await firstLeadsAsUser(queries.phone)));
  }

  const leads = [...found.values()];

  return {
    count: leads.length,
    leads: leads.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.emailFrom?.primaryEmail ?? null,
      leadType: row.leadType,
      wonStatus: row.wonStatus,
    })),
  };
});

export default defineLogicFunction({
  universalIdentifier: SIMILAR_LEADS_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'similar-leads',
  description: 'Finds leads with the same email domain, the same customer company or the same phone.',
  timeoutSeconds: 60,
  handler,
  httpRouteTriggerSettings: { path: SIMILAR_LEADS_ROUTE_PATH, httpMethod: 'POST', isAuthRequired: true },
});
