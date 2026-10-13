import { type MemberLevels } from 'src/roles/types/member-levels.type';

// One person on the Roles page. levels is null when their role is not one Platform made.
export type RolesPageRow = {
  workspaceMemberId: string;
  name: string;
  email: string;
  roleLabel: string;
  isAdmin: boolean;
  isSelf: boolean;
  levels: MemberLevels | null;
};
