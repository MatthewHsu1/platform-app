import { BLOCK_KEYS } from 'src/roles/blocks/block-keys.constant';
import { type CallerAccess } from 'src/roles/types/caller-access.type';

// Assignment runs are for sales administrators and the workspace admin only.
export const holdsSalesAdministrator = ({ isWorkspaceAdmin, blockKeys }: Pick<CallerAccess, 'isWorkspaceAdmin' | 'blockKeys'>) =>
  isWorkspaceAdmin || blockKeys.includes(BLOCK_KEYS.salesAdministrator);
