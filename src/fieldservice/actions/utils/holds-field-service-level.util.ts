import { BLOCK_KEYS } from 'src/roles/blocks/block-keys.constant';
import { type CallerAccess } from 'src/roles/types/caller-access.type';

const LEVELS = [BLOCK_KEYS.fieldServiceUserOwn, BLOCK_KEYS.fieldServiceUser, BLOCK_KEYS.fieldServiceDispatcher, BLOCK_KEYS.fieldServiceManager];

// A higher level includes the lower ones; the workspace admin holds every level.
export const holdsFieldServiceLevel = (
  { isWorkspaceAdmin, blockKeys }: Pick<CallerAccess, 'isWorkspaceAdmin' | 'blockKeys'>,
  level: (typeof LEVELS)[number],
) => isWorkspaceAdmin || LEVELS.slice(LEVELS.indexOf(level)).some((key) => blockKeys.includes(key));
