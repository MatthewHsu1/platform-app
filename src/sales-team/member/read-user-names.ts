import { memberName } from 'src/sales-team/member/utils/member-name.util';
import { records } from 'src/shared/triggers/records';

const workspaceMembers = records('workspaceMember', 'workspaceMembers');

// The display name of each workspace member, as a team member row shows it.
export const readUserNames = async (userIds: string[]) =>
  new Map(
    (
      await workspaceMembers.find<{ id: string; name: { firstName: string | null; lastName: string | null } | null }>(
        { id: { in: userIds } },
        'id name { firstName lastName }',
      )
    ).map((member) => [member.id, memberName(member.name)]),
  );
