import { escapeLike } from 'src/shared/utils/escape-like.util';
import { type RecordSearch } from 'src/shared/filter-editor/types/record-search.type';
import { queryAsUser } from 'src/shared/front-components/query-as-user';

const RESULT_LIMIT = 20;
const capitalize = (name: string) => `${name.charAt(0).toUpperCase()}${name.slice(1)}`;
const SINGULAR_BY_PLURAL: Record<string, string> = { people: 'person', companies: 'company' };
const singularOf = (objectPlural: string) => SINGULAR_BY_PLURAL[objectPlural] ?? objectPlural.replace(/s$/, '');

type FullName = { firstName: string | null; lastName: string | null } | null;
type RecordNode = Record<string, unknown> & { id: string };

const labelOf = (node: RecordNode, labelField: string, labelKind: 'text' | 'fullName') => {
  if (labelKind === 'text') {
    const value = node[labelField];

    return typeof value === 'string' && value !== '' ? value : node.id;
  }
  const name = node[labelField] as FullName;
  const text = [name?.firstName, name?.lastName].filter((part) => typeof part === 'string' && part !== '').join(' ');

  return text === '' ? node.id : text;
};

// Searches as the clicking user, so a picker lists only records they may see.
export const searchRecords: RecordSearch = async ({ objectPlural, labelField, labelKind, text, ids }) => {
  if (ids !== undefined && ids.length === 0) {
    return [];
  }
  const like = `%${escapeLike(text ?? '')}%`;
  const filter =
    ids !== undefined
      ? { id: { in: ids } }
      : labelKind === 'fullName'
        ? { or: [{ [labelField]: { firstName: { ilike: like } } }, { [labelField]: { lastName: { ilike: like } } }] }
        : { [labelField]: { ilike: like } };
  const selection = labelKind === 'fullName' ? `${labelField} { firstName lastName }` : labelField;
  const data = await queryAsUser<Record<string, { edges: { node: RecordNode }[] }>>(
    `query SearchRecords($filter: ${capitalize(singularOf(objectPlural))}FilterInput) {
      ${objectPlural}(filter: $filter, first: ${ids?.length ?? RESULT_LIMIT}) { edges { node { id ${selection} } } }
    }`,
    { filter },
  );

  return data[objectPlural].edges.map(({ node }) => ({ id: node.id, label: labelOf(node, labelField, labelKind) }));
};
