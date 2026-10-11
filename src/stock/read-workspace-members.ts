import { queryAsUser } from 'src/shared/front-components/query-as-user';
import { type WorkspaceMemberChoice } from 'src/stock/types/workspace-member-choice.type';

type MemberPage = {
  workspaceMembers: { edges: { node: WorkspaceMemberChoice }[]; pageInfo: { hasNextPage: boolean; endCursor: string | null } };
};

// Every workspace member, page by page, read as the clicking user.
export const readWorkspaceMembers = async () => {
  const members: WorkspaceMemberChoice[] = [];
  let after: string | null = null;

  do {
    const data: MemberPage = await queryAsUser<MemberPage>(
      `query Members($after: String) {
        workspaceMembers(first: 200, after: $after) {
          edges { node { id name { firstName lastName } } }
          pageInfo { hasNextPage endCursor }
        }
      }`,
      { after },
    );

    members.push(...data.workspaceMembers.edges.map(({ node }) => node));
    after = data.workspaceMembers.pageInfo.hasNextPage ? data.workspaceMembers.pageInfo.endCursor : null;
  } while (after !== null);

  return members;
};
