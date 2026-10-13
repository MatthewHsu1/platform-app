import { includingDeleted, pruneEmptyLists, records } from 'src/shared/triggers/records';
import { type GraphqlCaller, requireData, twentyGraphql } from 'src/shared/twenty-graphql';
import { chunks } from 'src/shared/utils/chunks.util';
import { type RowFinder } from 'src/stock/types/row-finder.type';

// Reads and writes a button makes for the clicking user: their rights apply,
// and the record triggers treat the writes as a user's.

const PAGE_SIZE = 200;
// Twenty's MUTATION_MAXIMUM_AFFECTED_RECORDS default.
const MUTATION_MAXIMUM_RECORDS = 100;

const capitalize = (name: string) => `${name.charAt(0).toUpperCase()}${name.slice(1)}`;

// Rows the clicking user can read, every page.
export const findAsPerson = async <TRow>(objectPlural: string, filterType: string, filter: Record<string, unknown>, selection: string) => {
  const rows: TRow[] = [];
  let after: string | null = null;

  do {
    const data: Record<string, { edges: { node: TRow }[]; pageInfo: { hasNextPage: boolean; endCursor: string | null } }> =
      requireData(
        await twentyGraphql(
          'person',
          `query Rows($filter: ${filterType}, $after: String) {
            ${objectPlural}(filter: $filter, first: ${PAGE_SIZE}, after: $after) {
              edges { node { ${selection} } }
              pageInfo { hasNextPage endCursor }
            }
          }`,
          { filter, after },
        ),
        `Read ${objectPlural}`,
      );
    rows.push(...data[objectPlural].edges.map((edge) => edge.node));
    after = data[objectPlural].pageInfo.hasNextPage ? data[objectPlural].pageInfo.endCursor : null;
  } while (after !== null);

  return rows;
};

// The same read, for a filter that may hold an empty `in` list: Twenty refuses
// one, and such a filter matches nothing.
export const findReadableAsPerson = async <TRow>(
  objectPlural: string,
  filterType: string,
  filter: Record<string, unknown>,
  selection: string,
) => {
  const sendable = pruneEmptyLists(filter);

  return sendable === null ? [] : findAsPerson<TRow>(objectPlural, filterType, sendable, selection);
};

// Rows as the clicking user reads them, or as the app reads them where no user is behind the call.
export const findAs =
  (caller: GraphqlCaller): RowFinder =>
  async <TRow>(objectSingular: string, objectPlural: string, filter: Record<string, unknown>, selection: string) =>
    caller === 'person'
      ? findReadableAsPerson<TRow>(objectPlural, `${capitalize(objectSingular)}FilterInput`, filter, selection)
      : records(objectSingular, objectPlural).find<TRow>(filter, selection);

export const createAsPerson = async (objectPlural: string, inputType: string, data: Record<string, unknown>[]) => {
  const ids: string[] = [];
  const mutation = `create${capitalize(objectPlural)}`;

  for (const part of chunks(data, MUTATION_MAXIMUM_RECORDS)) {
    const result = requireData(
      await twentyGraphql<Record<string, { id: string }[]>>(
        'person',
        `mutation Create($data: [${inputType}!]!) { ${mutation}(data: $data) { id } }`,
        { data: part },
      ),
      `Create ${objectPlural}`,
    );
    ids.push(...result[mutation].map((row) => row.id));
  }

  return ids;
};

// Move lines the user makes, shaped for createMissingRows: the line triggers
// link them to a move and reserve them as for any line typed in.
export const personMoveLines = {
  findIncludingDeleted: <TRecord>(filter: Record<string, unknown>, selection: string) =>
    findAsPerson<TRecord>('stockMoveLines', 'StockMoveLineFilterInput', includingDeleted(filter), selection),
  createMany: (data: Record<string, unknown>[]) => createAsPerson('stockMoveLines', 'StockMoveLineCreateInput', data),
};

type UserObject = 'stockMoveLine' | 'stockMove' | 'stockPackage' | 'stockWarehouseOrderpoint';

export const updateAsUser = async (objectSingular: UserObject, ids: string[], data: Record<string, unknown>) => {
  const typeName = capitalize(objectSingular);

  for (const part of chunks([...new Set(ids)], MUTATION_MAXIMUM_RECORDS)) {
    requireData(
      await twentyGraphql(
        'person',
        `mutation UpdateMany($filter: ${typeName}FilterInput!, $data: ${typeName}UpdateInput!) {
          update${typeName}s(filter: $filter, data: $data) { id }
        }`,
        { filter: { id: { in: part } }, data },
      ),
      `Update ${objectSingular}`,
    );
  }
};

export const deleteAsUser = async (objectSingular: UserObject, ids: string[]) => {
  const typeName = capitalize(objectSingular);

  for (const part of chunks([...new Set(ids)], MUTATION_MAXIMUM_RECORDS)) {
    requireData(
      await twentyGraphql(
        'person',
        `mutation DeleteMany($filter: ${typeName}FilterInput!) { delete${typeName}s(filter: $filter) { id } }`,
        { filter: { id: { in: part } } },
      ),
      `Delete ${objectSingular}`,
    );
  }
};
