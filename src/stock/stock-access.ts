import { requireUpdateRights } from 'src/shared/object-rights';
import { requireData, twentyGraphql } from 'src/shared/twenty-graphql';
import { STOCK_WAREHOUSE_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/stock/stock-universal-identifiers.constant';

const capitalize = (name: string) => `${name.charAt(0).toUpperCase()}${name.slice(1)}`;
const PAGE_SIZE = 200;

// The clicking user's row rules decide what a button may touch: ids they
// cannot read are dropped, as if they did not exist.
export const filterReadableIds = async (objectSingular: string, objectPlural: string, ids: string[]) => {
  const wanted = [...new Set(ids)];
  const readable = new Set<string>();

  for (let start = 0; start < wanted.length; start += PAGE_SIZE) {
    const part = wanted.slice(start, start + PAGE_SIZE);
    const data = requireData(
      await twentyGraphql<Record<string, { edges: { node: { id: string } }[] }>>(
        'person',
        `query Readable($filter: ${capitalize(objectSingular)}FilterInput) {
          ${objectPlural}(filter: $filter, first: ${PAGE_SIZE}) { edges { node { id } } }
        }`,
        { filter: { id: { in: part } } },
      ),
      `Read ${objectPlural}`,
    );
    data[objectPlural].edges.forEach(({ node }) => readable.add(node.id));
  }

  return wanted.filter((id) => readable.has(id));
};

// Some buttons belong to the inventory manager. Only a manager may edit warehouses, so that right
// tells a manager from a stock user.
export const requireStockManagerRight = () => requireUpdateRights([STOCK_WAREHOUSE_OBJECT_UNIVERSAL_IDENTIFIER]);
