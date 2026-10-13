import { twentyGraphql, twentyMetadata } from 'src/shared/twenty-graphql';
import { textOrNull } from 'src/shared/utils/text-or-null.util';

const DEFAULT_LOCALE = 'en';

// The clicking user: the app token of a button carries the user, so
// currentUser answers with their workspace member.
export const readUserLocale = async () => {
  const response = await twentyMetadata<{ currentUser: { workspaceMember: { locale: string | null } | null } | null }>(
    'person',
    `{ currentUser { workspaceMember { locale } } }`,
  );

  return textOrNull(response.data?.currentUser?.workspaceMember?.locale) ?? DEFAULT_LOCALE;
};

export const readMemberLocale = async (workspaceMemberId: string | undefined) => {
  if (workspaceMemberId === undefined) {
    return DEFAULT_LOCALE;
  }
  const response = await twentyGraphql<{ workspaceMember: { locale: string | null } | null }>(
    'application',
    `query MemberLocale($id: UUID!) { workspaceMember(filter: { id: { eq: $id } }) { locale } }`,
    { id: workspaceMemberId },
  );

  return textOrNull(response.data?.workspaceMember?.locale) ?? DEFAULT_LOCALE;
};
