import { escapeLike } from 'src/shared/utils/escape-like.util';
import { queryAsUser } from 'src/shared/front-components/query-as-user';
import { type PickedRecord } from 'src/shared/front-components/types/picked-record.type';

const RESULTS = 10;

type PersonNode = { id: string; name: { firstName: string | null; lastName: string | null } | null; emails: { primaryEmail: string | null } | null };

// Contacts whose name or email holds the text, read as the user.
export const searchPeople = async (text: string): Promise<PickedRecord[]> => {
  const data = await queryAsUser<{ people: { edges: { node: PersonNode }[] } }>(
    `query SearchPeople($like: String!) {
      people(
        filter: { or: [{ name: { firstName: { ilike: $like } } }, { name: { lastName: { ilike: $like } } }, { emails: { primaryEmail: { ilike: $like } } }] }
        first: ${RESULTS}
      ) {
        edges { node { id name { firstName lastName } emails { primaryEmail } } }
      }
    }`,
    { like: `%${escapeLike(text)}%` },
  );

  return data.people.edges.map(({ node }) => ({
    id: node.id,
    label: [[node.name?.firstName, node.name?.lastName].filter(Boolean).join(' '), node.emails?.primaryEmail]
      .filter(Boolean)
      .join(' · '),
  }));
};

export const searchCompanies = async (text: string): Promise<PickedRecord[]> => {
  const data = await queryAsUser<{ companies: { edges: { node: { id: string; name: string | null } }[] } }>(
    `query SearchCompanies($like: String!) {
      companies(filter: { name: { ilike: $like } }, first: ${RESULTS}) { edges { node { id name } } }
    }`,
    { like: `%${escapeLike(text)}%` },
  );

  return data.companies.edges.map(({ node }) => ({ id: node.id, label: node.name ?? '' }));
};
