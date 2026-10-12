import { type OneHopLookup } from 'src/shared/filter-editor/types/one-hop-lookup.type';
import { type GraphqlCaller, requireData, twentyGraphql } from 'src/shared/twenty-graphql';

const PAGE_SIZE = 200;
const capitalize = (name: string) => `${name.charAt(0).toUpperCase()}${name.slice(1)}`;

type IdPage = Record<string, { edges: { node: { id: string } }[]; pageInfo: { hasNextPage: boolean; endCursor: string | null } }>;

// Reads every id of the related object that meets the condition. A widget
// checks with the clicking user's rights; the assignment run with the app's.
export const lookupOneHop =
  (caller: GraphqlCaller): OneHopLookup =>
  async (hop, condition) => {
    const ids: string[] = [];
    let after: string | null = null;

    do {
      const data: IdPage = requireData(
        await twentyGraphql<IdPage>(
          caller,
          `query OneHop($filter: ${capitalize(hop.objectSingular)}FilterInput, $after: String) {
            ${hop.objectPlural}(filter: $filter, first: ${PAGE_SIZE}, after: $after) {
              edges { node { id } }
              pageInfo { hasNextPage endCursor }
            }
          }`,
          { filter: condition, after },
        ),
        `Find ${hop.objectPlural}`,
      );
      const connection = data[hop.objectPlural];

      ids.push(...connection.edges.map((edge) => edge.node.id));
      after = connection.pageInfo.hasNextPage ? connection.pageInfo.endCursor : null;
    } while (after !== null);

    return ids;
  };
