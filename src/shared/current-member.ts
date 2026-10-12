import { describeGraphqlErrors, type GraphqlResponse, twentyMetadata } from 'src/shared/twenty-graphql';

type CurrentMemberAnswer = {
  currentUser: { workspaceMember: { id: string; name: { firstName: string | null; lastName: string | null } | null } | null } | null;
};

// Read with the clicking user's token (the same query readUserLocale makes).
const askCurrentMember = () =>
  twentyMetadata<CurrentMemberAnswer>('person', '{ currentUser { workspaceMember { id name { firstName lastName } } } }');

const toMember = (response: GraphqlResponse<CurrentMemberAnswer>) => {
  const member = response.data?.currentUser?.workspaceMember;

  if (member === null || member === undefined) {
    return null;
  }
  return { id: member.id, name: [member.name?.firstName, member.name?.lastName].filter(Boolean).join(' ') };
};

// The clicking user's workspace member with the name a note shows; null when
// there is none or the read fails.
export const readCurrentMember = async () => toMember(await askCurrentMember());

export const readCurrentMemberId = async (): Promise<string | null> => (await readCurrentMember())?.id ?? null;

// Twenty refuses `currentUser` with FORBIDDEN for a token with no person
// behind it, such as an API key.
const NO_PERSON_CODE = 'FORBIDDEN';

// Like readCurrentMember, but only "nobody signed in" reads as null: any other
// failure throws, so an outage is not taken for a refusal.
export const readSignedInMember = async () => {
  const response = await askCurrentMember();

  if (response.errors !== undefined && response.errors.length > 0) {
    if (response.errors.every((error) => error.extensions?.code === NO_PERSON_CODE)) {
      return null;
    }
    throw new Error(`Read the signed-in user: ${describeGraphqlErrors(response.errors)}`);
  }
  return toMember(response);
};
