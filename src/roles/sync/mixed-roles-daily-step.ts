import { type RoleSyncResult } from 'src/roles/types/role-sync-result.type';

// A role Twenty refused to rebuild fails the step, so the daily job's logs show it; warnings (an
// admin's choice such as a mixed default role) are only notes on the job result.
export const makeMixedRolesStep =
  (sync: () => Promise<Pick<RoleSyncResult, 'warnings' | 'failed'>>) =>
  async (): Promise<string[]> => {
    const { warnings, failed } = await sync();

    if (failed.length > 0) {
      throw new Error(failed.map(({ roleId, message }) => `${roleId}: ${message}`).join(' / '));
    }

    return warnings;
  };
