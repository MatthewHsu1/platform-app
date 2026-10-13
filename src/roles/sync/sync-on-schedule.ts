import { RoleSyncBusyError, syncMixedRoles } from 'src/roles/sync/sync-mixed-roles';
import { type RoleSyncResult } from 'src/roles/types/role-sync-result.type';

// Install and the daily job: rebuild every mixed role from today's building blocks, delete unused
// ones, rewrite the row rules. When a Roles page save holds the claim, that save does the same work,
// so this run stops quietly. A role Twenty refused to rebuild comes back in `failed` (the sync goes
// on with the others), so the caller can report it without failing.
export const syncMixedRolesOnSchedule = async (): Promise<Pick<RoleSyncResult, 'warnings' | 'failed'>> => {
  try {
    return await syncMixedRoles({ kind: 'rebuild' });
  } catch (error) {
    if (error instanceof RoleSyncBusyError) {
      return { warnings: [], failed: [] };
    }
    throw error;
  }
};
