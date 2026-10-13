import { ADMIN_ROLE_UNIVERSAL_IDENTIFIER } from 'src/roles/constants/admin-role-universal-identifier.constant';
import { type MixTable } from 'src/roles/types/mix-table.type';
import { type RoleModule } from 'src/roles/types/role-module.type';
import { type RoleSyncSnapshot } from 'src/roles/types/role-sync-snapshot.type';
import { type RolesPageRow } from 'src/roles/types/roles-page-row.type';
import { blockKeysToLevels } from 'src/roles/utils/member-levels.util';

// Each person's real role. A mixed role (also one an admin picked by hand on Twenty's Members page)
// reads back into its levels; the default role reads as None everywhere.
export const planRolesPageRows = ({
  snapshot,
  table,
  callerMemberId,
  modules,
}: {
  snapshot: RoleSyncSnapshot;
  table: MixTable;
  callerMemberId: string | null;
  modules: RoleModule[];
}): RolesPageRow[] =>
  snapshot.members
    .map((member) => {
      const role = snapshot.roles.find((candidate) => candidate.memberIds.includes(member.id));
      const keys = role === undefined ? undefined : table.roles[role.id];

      return {
        workspaceMemberId: member.id,
        name: member.name,
        email: member.email,
        roleLabel: role?.label ?? '',
        isAdmin: role?.universalIdentifier === ADMIN_ROLE_UNIVERSAL_IDENTIFIER,
        isSelf: member.id === callerMemberId,
        levels: keys !== undefined ? blockKeysToLevels(keys, modules) : role?.id === snapshot.defaultRoleId ? blockKeysToLevels([], modules) : null,
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name) || left.email.localeCompare(right.email));
