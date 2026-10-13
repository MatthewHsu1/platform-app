import { type RoutePayload } from 'twenty-sdk/define';

import { readBody } from 'src/shared/route-response';
import { requireData, twentyGraphql } from 'src/shared/twenty-graphql';

const PAGE_SIZE = 200;
const MUTATION_MAXIMUM_RECORDS = 100;

export const readAttributeValueId = (payload: RoutePayload) => {
  const { attributeValueId } = readBody(payload);

  return typeof attributeValueId === 'string' && attributeValueId.length > 0 ? attributeValueId : null;
};

// Reads as the clicking user, so a value their permissions hide is "not found".
export const findAttributeValue = async <TValue>(attributeValueId: string, selection: string) => {
  const found = await twentyGraphql<{ productAttributeValue: TValue | null }>(
    'person',
    `query AttributeValueForAction($id: UUID!) {
      productAttributeValue(filter: { id: { eq: $id } }) { ${selection} }
    }`,
    { id: attributeValueId },
  );

  return found.data?.productAttributeValue ?? null;
};

export const listAsPerson = async <TRecord>({
  singular,
  plural,
  filter,
  selection,
}: {
  singular: string;
  plural: string;
  filter: Record<string, unknown>;
  selection: string;
}) => {
  const rows: TRecord[] = [];
  let after: string | null = null;

  do {
    const data: Record<
      string,
      { edges: { node: TRecord }[]; pageInfo: { hasNextPage: boolean; endCursor: string | null } }
    > = requireData(
      await twentyGraphql(
        'person',
        `query List($filter: ${singular}FilterInput, $after: String) {
          ${plural}(filter: $filter, first: ${PAGE_SIZE}, after: $after) {
            edges { node { ${selection} } }
            pageInfo { hasNextPage endCursor }
          }
        }`,
        { filter, after },
      ),
      `List ${plural}`,
    );
    rows.push(...data[plural].edges.map((edge) => edge.node));
    after = data[plural].pageInfo.hasNextPage ? data[plural].pageInfo.endCursor : null;
  } while (after !== null);

  return rows;
};

export const inChunks = <TItem>(items: TItem[]) => {
  const parts: TItem[][] = [];

  for (let start = 0; start < items.length; start += MUTATION_MAXIMUM_RECORDS) {
    parts.push(items.slice(start, start + MUTATION_MAXIMUM_RECORDS));
  }
  return parts;
};
