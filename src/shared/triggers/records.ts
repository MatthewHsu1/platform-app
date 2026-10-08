import { requireData, twentyGraphql } from 'src/shared/twenty-graphql';

const capitalize = (name: string) => `${name.charAt(0).toUpperCase()}${name.slice(1)}`;
const PAGE_SIZE = 200;
// Twenty's MUTATION_MAXIMUM_AFFECTED_RECORDS default.
const MUTATION_MAXIMUM_RECORDS = 100;

type Connection<TRecord> = {
  edges: { node: TRecord }[];
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
};

const chunks = <TItem>(items: TItem[]) => {
  const result: TItem[][] = [];
  for (let start = 0; start < items.length; start += MUTATION_MAXIMUM_RECORDS) {
    result.push(items.slice(start, start + MUTATION_MAXIMUM_RECORDS));
  }
  return result;
};

// Twenty hides soft-deleted rows unless the filter names deletedAt.
export const includingDeleted = (filter: Record<string, unknown>) => ({
  and: [filter, { or: [{ deletedAt: { is: 'NULL' } }, { deletedAt: { is: 'NOT_NULL' } }] }],
});

export const records = (objectSingular: string, objectPlural: string) => {
  const find = async <TRecord>(filter: Record<string, unknown>, selection: string): Promise<TRecord[]> => {
    const found: TRecord[] = [];
    let after: string | null = null;

    do {
      const data: Record<string, Connection<TRecord>> = requireData(
        await twentyGraphql(
          'application',
          `query Find($filter: ${capitalize(objectSingular)}FilterInput, $after: String) {
              ${objectPlural}(filter: $filter, first: ${PAGE_SIZE}, after: $after) {
                edges { node { ${selection} } }
                pageInfo { hasNextPage endCursor }
              }
            }`,
          { filter, after },
        ),
        `Find ${objectPlural}`,
      );
      found.push(...data[objectPlural].edges.map((edge) => edge.node));
      after = data[objectPlural].pageInfo.hasNextPage ? data[objectPlural].pageInfo.endCursor : null;
    } while (after !== null);

    return found;
  };

  // Returns the ids the mutation reached: a row another run has already
  // removed is not among them.
  const mutateByIds = async (
    operation: 'delete' | 'restore' | 'destroy',
    ids: string[],
    extraFilter: Record<string, unknown> = {},
  ) => {
    const reached: string[] = [];
    const mutation = `${operation}${capitalize(objectPlural)}`;

    for (const part of chunks([...new Set(ids)])) {
      const data = requireData(
        await twentyGraphql<Record<string, { id: string }[] | null>>(
          'application',
          `mutation Many($filter: ${capitalize(objectSingular)}FilterInput!) {
            ${mutation}(filter: $filter) { id }
          }`,
          { filter: { id: { in: part }, ...extraFilter } },
        ),
        `${capitalize(operation)} ${objectPlural}`,
      );
      reached.push(...(data[mutation] ?? []).map((row) => row.id));
    }
    return reached;
  };

  return {
    objectSingular,
    objectPlural,

    find,

    findIncludingDeleted: <TRecord>(filter: Record<string, unknown>, selection: string) =>
      find<TRecord>(includingDeleted(filter), selection),

    update: async (id: string, data: Record<string, unknown>) => {
      if (Object.keys(data).length === 0) {
        return;
      }
      requireData(
        await twentyGraphql(
          'application',
          `mutation Update($id: UUID!, $data: ${capitalize(objectSingular)}UpdateInput!) {
          update${capitalize(objectSingular)}(id: $id, data: $data) { id }
        }`,
          { id, data },
        ),
        `Update ${objectSingular} ${id}`,
      );
    },

    // The same values on many rows, one request per 100 rows.
    updateMany: async (ids: string[], data: Record<string, unknown>) => {
      for (const part of chunks([...new Set(ids)])) {
        requireData(
          await twentyGraphql(
            'application',
            `mutation UpdateMany($filter: ${capitalize(objectSingular)}FilterInput!, $data: ${capitalize(objectSingular)}UpdateInput!) {
              update${capitalize(objectPlural)}(filter: $filter, data: $data) { id }
            }`,
            { filter: { id: { in: part } }, data },
          ),
          `Update ${objectPlural}`,
        );
      }
    },

    createMany: async (data: Record<string, unknown>[]) => {
      const ids: string[] = [];

      for (const part of chunks(data)) {
        const created = requireData(
          await twentyGraphql<Record<string, { id: string }[]>>(
            'application',
            `mutation Create($data: [${capitalize(objectSingular)}CreateInput!]!) {
            create${capitalize(objectPlural)}(data: $data) { id }
          }`,
            { data: part },
          ),
          `Create ${objectPlural}`,
        );
        ids.push(...created[`create${capitalize(objectPlural)}`].map((row) => row.id));
      }

      return ids;
    },

    softDelete: async (id: string) => {
      requireData(
        await twentyGraphql(
          'application',
          `mutation Delete($id: UUID!) { delete${capitalize(objectSingular)}(id: $id) { id } }`,
          { id },
        ),
        `Delete ${objectSingular} ${id}`,
      );
    },

    softDeleteMany: (ids: string[]) => mutateByIds('delete', ids),

    restore: async (id: string) => {
      requireData(
        await twentyGraphql(
          'application',
          `mutation Restore($id: UUID!) { restore${capitalize(objectSingular)}(id: $id) { id } }`,
          { id },
        ),
        `Restore ${objectSingular} ${id}`,
      );
    },

    restoreMany: (ids: string[]) => mutateByIds('restore', ids),

    // A removed many-to-many link must lose its row; a soft-deleted link
    // row would block the same link for good (the unique index counts it).
    destroyMany: (ids: string[]) => mutateByIds('destroy', ids, includingDeleted({})),

    // Only rows still soft-deleted: a row restored meanwhile stays.
    destroySoftDeleted: (ids: string[]) =>
      mutateByIds('destroy', ids, { deletedAt: { is: 'NOT_NULL' } }),
  };
};

export type Records = ReturnType<typeof records>;

export type FindSpec = { of: Records; filter: Record<string, unknown>; selection: string };

// Several lists in one request (Twenty refuses the same list twice in one
// request). A list longer than a page is read again page by page.
export const findMany = async <TResult extends Record<string, unknown[]>>(
  specs: { [TKey in keyof TResult]: FindSpec },
): Promise<TResult> => {
  const entries = Object.entries(specs) as [string, FindSpec][];
  const lists = entries.map(([, spec]) => spec.of.objectPlural);
  if (new Set(lists).size !== lists.length) {
    throw new Error(`findMany names a list twice: ${lists.join(', ')}`);
  }
  const variables = Object.fromEntries(entries.map(([alias, spec]) => [alias, spec.filter]));
  const data = requireData(
    await twentyGraphql<Record<string, Connection<unknown>>>(
      'application',
      `query FindMany(${entries
        .map(([alias, spec]) => `$${alias}: ${capitalize(spec.of.objectSingular)}FilterInput`)
        .join(', ')}) {
        ${entries
          .map(
            ([alias, spec]) => `${alias}: ${spec.of.objectPlural}(filter: $${alias}, first: ${PAGE_SIZE}) {
              edges { node { ${spec.selection} } }
              pageInfo { hasNextPage endCursor }
            }`,
          )
          .join('\n')}
      }`,
      variables,
    ),
    `Find ${entries.map(([, spec]) => spec.of.objectPlural).join(', ')}`,
  );
  const result: Record<string, unknown[]> = {};

  for (const [alias, spec] of entries) {
    result[alias] = data[alias].pageInfo.hasNextPage
      ? await spec.of.find(spec.filter, spec.selection)
      : data[alias].edges.map((edge) => edge.node);
  }

  return result as TResult;
};
