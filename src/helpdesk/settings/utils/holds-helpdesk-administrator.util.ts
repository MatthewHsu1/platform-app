import { BLOCK_KEYS } from 'src/roles/blocks/block-keys.constant';
import { type CallerAccess } from 'src/roles/types/caller-access.type';

// The work case settings are changed by the workspace admin and by whoever holds Work cases: Administrator.
export const holdsHelpdeskAdministrator = ({ isWorkspaceAdmin, blockKeys }: Pick<CallerAccess, 'isWorkspaceAdmin' | 'blockKeys'>) =>
  isWorkspaceAdmin || blockKeys.includes(BLOCK_KEYS.workCasesAdministrator);
