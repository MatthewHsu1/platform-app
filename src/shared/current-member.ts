import { type GraphqlResponse, twentyMetadata } from 'src/shared/twenty-graphql';

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
