import { requireData, twentyGraphql } from 'src/shared/twenty-graphql';

const capitalize = (name: string) => `${name.charAt(0).toUpperCase()}${name.slice(1)}`;

export const updateWhere = async ({
  objectSingular,
  objectPlural,
  filter,
  data,
}: {
  objectSingular: string;
  objectPlural: string;
  filter: Record<string, unknown>;
  data: Record<string, unknown>;
}): Promise<string[]> => {
  const mutation = `update${capitalize(objectPlural)}`;
  const result = requireData(
    await twentyGraphql<Record<string, { id: string }[] | null>>(
      'application',
      `mutation UpdateWhere($filter: ${capitalize(objectSingular)}FilterInput!, $data: ${capitalize(objectSingular)}UpdateInput!) {
        ${mutation}(filter: $filter, data: $data) { id }
      }`,
      { filter, data },
    ),
    `Update ${objectPlural} where`,
  );

  return (result[mutation] ?? []).map((row) => row.id);
};

// Twenty runs the filter inside one SQL UPDATE, so Postgres re-checks the
// version under the row lock: of two writers holding the same version, only
// one reaches the row.
export const compareAndSet = async ({
  objectSingular,
  objectPlural,
  id,
  version,
  data,
}: {
  objectSingular: string;
  objectPlural: string;
  id: string;
  version: number;
  data: Record<string, unknown>;
}): Promise<boolean> => {
  if (data.version !== version + 1) {
    throw new Error(`compareAndSet on ${objectSingular} ${id} must write version ${version + 1}.`);
  }
  const reached = await updateWhere({
    objectSingular,
    objectPlural,
    filter: { id: { eq: id }, version: { eq: version } },
    data,
  });

  return reached.length === 1;
};
