import { twentyMetadata } from 'src/shared/twenty-graphql';

// The workspace member of the clicking user, read with that user's token (the
// same query readUserLocale makes).
export const readCurrentMemberId = async (): Promise<string | null> => {
  const response = await twentyMetadata<{
    currentUser: { workspaceMember: { id: string } | null } | null;
  }>('person', '{ currentUser { workspaceMember { id } } }');

  return response.data?.currentUser?.workspaceMember?.id ?? null;
};
