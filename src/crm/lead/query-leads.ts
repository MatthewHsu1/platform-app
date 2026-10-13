import { leadSelection, readLeadRow } from 'src/crm/lead/lead-selection';
import { type LeadRow } from 'src/crm/lead/types/lead-row.type';
import { readWithScoringFields } from 'src/crm/lead/utils/read-with-scoring-fields.util';
import { pruneEmptyLists } from 'src/shared/triggers/records';
import { type GraphqlCaller, requireData, twentyGraphql } from 'src/shared/twenty-graphql';

const PAGE_SIZE = 200;

type LeadPage = {
  crmLeads: {
    edges: { node: Record<string, unknown> }[];
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
  };
};

// Every matching lead that is not in the trash, page by page. With the person
// caller the user's row rule applies: a lead they cannot see is not returned.
// Tags and language are read only when asked, by callers that write them back.
// With a limit, only the first leads up to it.
export const queryLeads = async (
  caller: GraphqlCaller,
  filter: Record<string, unknown>,
  {
    orderBy,
    withScoringFields = false,
    limit,
  }: { orderBy?: Record<string, string>[]; withScoringFields?: boolean; limit?: number } = {},
): Promise<LeadRow[]> => {
  const sendable = pruneEmptyLists(filter);

  if (sendable === null) {
    return [];
  }

  const readAll = async (selection: string) => {
    const found: LeadRow[] = [];
    let after: string | null = null;

    do {
      const page: LeadPage = requireData(
        await twentyGraphql<LeadPage>(
          caller,
          `query QueryLeads($filter: CrmLeadFilterInput, $after: String, $orderBy: [CrmLeadOrderByInput]) {
            crmLeads(filter: $filter, first: ${Math.min(limit ?? PAGE_SIZE, PAGE_SIZE)}, after: $after, orderBy: $orderBy) {
              edges { node { ${selection} } }
              pageInfo { hasNextPage endCursor }
            }
          }`,
          { filter: sendable, after, orderBy: orderBy ?? [{ createdAt: 'AscNullsLast' }, { id: 'AscNullsLast' }] },
        ),
        'Find leads',
      );

      found.push(...page.crmLeads.edges.map(({ node }) => readLeadRow(node)));
      after = page.crmLeads.pageInfo.hasNextPage && (limit === undefined || found.length < limit) ? page.crmLeads.pageInfo.endCursor : null;
    } while (after !== null);

    return limit === undefined ? found : found.slice(0, limit);
  };

  return withScoringFields ? readWithScoringFields(readAll, { withTeam: true }) : readAll(leadSelection({ withTeam: true }));
};
