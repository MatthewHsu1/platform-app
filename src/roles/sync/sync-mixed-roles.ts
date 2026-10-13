import { ROLE_SYNC_BUSY_MESSAGE } from 'src/roles/constants/role-sync-busy-message.constant';
import { runRoleSync } from 'src/roles/sync/run-role-sync';
import { twentyRoleSyncApi } from 'src/roles/sync/twenty-role-sync-api';
import { type RoleSyncRequest } from 'src/roles/types/role-sync-request.type';
import { type RoleSyncResult } from 'src/roles/types/role-sync-result.type';
import { claimKey, withClaim } from 'src/shared/claims/claim';

export class RoleSyncBusyError extends Error {
  constructor() {
    super(ROLE_SYNC_BUSY_MESSAGE);
    this.name = 'RoleSyncBusyError';
  }
}

// One sync at a time in a workspace: two saves, or a save and the daily job, would read the same
// mix table and one would lose the other's role.
export const syncMixedRoles = async (request: RoleSyncRequest): Promise<RoleSyncResult> => {
  const outcome = await withClaim(claimKey('roles', 'mixed-roles'), () => runRoleSync({ api: twentyRoleSyncApi, request }));

  if (outcome.kind === 'held') {
    throw new RoleSyncBusyError();
  }

  return outcome.result;
};
