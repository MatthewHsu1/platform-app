import { pruneEmptyLists } from 'src/shared/triggers/records';
import { requireData, twentyGraphql } from 'src/shared/twenty-graphql';
import { emptyTextToNull } from 'src/shared/utils/empty-text-to-null.util';

const capitalize = (name: string) => `${name.charAt(0).toUpperCase()}${name.slice(1)}`;

// A few rows, not every page: enough to refuse a delete or name a few records.
export const findSome = async <TRow>(
  objectSingular: string,
  objectPlural: string,
  filter: Record<string, unknown>,
  selection: string,
  limit = 50,
): Promise<TRow[]> => {
  const sendable = pruneEmptyLists(filter);
  if (sendable === null) {
    return [];
  }
  const data = requireData(
    await twentyGraphql<Record<string, { edges: { node: TRow }[] }>>(
      'application',
      `query FindSome($filter: ${capitalize(objectSingular)}FilterInput) {
        ${objectPlural}(filter: $filter, first: ${limit}) { edges { node { ${selection} } } }
      }`,
      { filter: sendable },
    ),
    `Find ${objectPlural}`,
  );

  return emptyTextToNull(
    data[objectPlural].edges.map((edge) => edge.node),
    selection,
  );
};

export const anyRowWhere = async (objectSingular: string, objectPlural: string, filter: Record<string, unknown>) =>
  (await findSome(objectSingular, objectPlural, filter, 'id', 1)).length > 0;
