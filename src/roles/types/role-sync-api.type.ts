import { type MixTable } from 'src/roles/types/mix-table.type';
import { type MixedRoleSettings } from 'src/roles/types/mixed-role-settings.type';
import { type RoleSyncSnapshot } from 'src/roles/types/role-sync-snapshot.type';
import { type RoleWrite } from 'src/roles/types/role-write.type';

// What the sync reads from and writes to Twenty; the tests use an in-memory one.
export type RoleSyncApi = {
  readSnapshot: () => Promise<RoleSyncSnapshot>;
  readMixTable: () => Promise<unknown>;
  writeMixTable: (table: MixTable) => Promise<void>;
  createRole: (input: { id: string; settings: MixedRoleSettings }) => Promise<void>;
  applyWrite: (write: RoleWrite) => Promise<void>;
  assignRole: (workspaceMemberId: string, roleId: string) => Promise<void>;
  deleteRole: (roleId: string) => Promise<void>;
  readRowAccessConfig: () => Promise<string | null>;
  writeRowAccessConfig: (value: string) => Promise<void>;
};
