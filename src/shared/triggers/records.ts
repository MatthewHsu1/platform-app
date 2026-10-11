import { requireData, twentyGraphql } from 'src/shared/twenty-graphql';
import { emptyTextToNull } from 'src/shared/utils/empty-text-to-null.util';
import { chunks } from 'src/shared/utils/chunks.util';

const capitalize = (name: string) => `${name.charAt(0).toUpperCase()}${name.slice(1)}`;
const PAGE_SIZE = 200;
// Twenty's MUTATION_MAXIMUM_AFFECTED_RECORDS default.
export const MUTATION_MAXIMUM_RECORDS = 100;

type Connection<TRecord> = {
  edges: { node: TRecord }[];
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
};

// Twenty hides soft-deleted rows unless the filter names deletedAt.
export const includingDeleted = (filter: Record<string, unknown>) => ({
  and: [filter, { or: [{ deletedAt: { is: 'NULL' } }, { deletedAt: { is: 'NOT_NULL' } }] }],
});

const isObject = (value: unknown): value is { in?: unknown } & Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isEmptyInList = (condition: unknown) =>
  isObject(condition) && Array.isArray(condition.in) && condition.in.length === 0;

const pruneParts = (parts: unknown[]) =>
  parts.map((part) => (isObject(part) ? pruneEmptyLists(part) : part));

// Twenty refuses `in: []`. A field required to be in an empty list matches no
// row: the whole filter (null), or just that branch of an `or`. Inside `not`
// it excludes nothing, so it goes through for Twenty to answer.
export const pruneEmptyLists = (filter: Record<string, unknown>): Record<string, unknown> | null => {
  const pruned: Record<string, unknown> = {};

  for (const [field, condition] of Object.entries(filter)) {
    if (field === 'and' && Array.isArray(condition)) {
      const parts = pruneParts(condition);
      if (parts.includes(null)) {
        return null;
      }
      pruned[field] = parts;
    } else if (field === 'or' && Array.isArray(condition) && condition.length > 0) {
      const branches = pruneParts(condition).filter((branch) => branch !== null);
      if (branches.length === 0) {
        return null;
      }
      pruned[field] = branches;
    } else if (field !== 'and' && field !== 'or' && field !== 'not' && isEmptyInList(condition)) {
      return null;
    } else {
      pruned[field] = condition;
    }
  }

  return pruned;
};

export const records = (objectSingular: string, objectPlural: string) => {
  const find = async <TRecord>(filter: Record<string, unknown>, selection: string): Promise<TRecord[]> => {
    const sendable = pruneEmptyLists(filter);
    if (sendable === null) {
      return [];
    }
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
          { filter: sendable, after },
        ),
        `Find ${objectPlural}`,
      );
      found.push(...data[objectPlural].edges.map((edge) => edge.node));
      after = data[objectPlural].pageInfo.hasNextPage ? data[objectPlural].pageInfo.endCursor : null;
    } while (after !== null);

    return emptyTextToNull(found, selection);
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

    for (const part of chunks([...new Set(ids)], MUTATION_MAXIMUM_RECORDS)) {
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
      for (const part of chunks([...new Set(ids)], MUTATION_MAXIMUM_RECORDS)) {
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

      for (const part of chunks(data, MUTATION_MAXIMUM_RECORDS)) {
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
  const allEntries = Object.entries(specs) as [string, FindSpec][];
  const lists = allEntries.map(([, spec]) => spec.of.objectPlural);
  if (new Set(lists).size !== lists.length) {
    throw new Error(`findMany names a list twice: ${lists.join(', ')}`);
  }
  const result: Record<string, unknown[]> = {};
  const entries: [string, FindSpec][] = [];
  const variables: Record<string, unknown> = {};

  for (const [alias, spec] of allEntries) {
    const sendable = pruneEmptyLists(spec.filter);
    if (sendable === null) {
      result[alias] = [];
    } else {
      entries.push([alias, { ...spec, filter: sendable }]);
      variables[alias] = sendable;
    }
  }
  if (entries.length === 0) {
    return result as TResult;
  }

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

  for (const [alias, spec] of entries) {
    result[alias] = data[alias].pageInfo.hasNextPage
      ? await spec.of.find(spec.filter, spec.selection)
      : emptyTextToNull(
          data[alias].edges.map((edge) => edge.node),
          spec.selection,
        );
  }

  return result as TResult;
};
