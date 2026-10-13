import { requireData, twentyGraphql } from 'src/shared/twenty-graphql';

// One lead is enough to block a delete. Leads in the trash are not counted;
// every status is. Runs as the app alone.
export const leadExistsWhere = async (filter: Record<string, unknown>) =>
  requireData(
    await twentyGraphql<{ crmLeads: { edges: { node: { id: string } }[] } }>(
      'application',
      `query AnyLead($filter: CrmLeadFilterInput) { crmLeads(filter: $filter, first: 1) { edges { node { id } } } }`,
      { filter },
    ),
    'Look for a lead',
  ).crmLeads.edges.length > 0;
