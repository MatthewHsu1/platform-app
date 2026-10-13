import { type CallerAccess } from 'src/roles/types/caller-access.type';

// Admin, or anyone whose role holds the Roles permission.
export const mayManageRoles = (access: CallerAccess): boolean => access.isWorkspaceAdmin || access.canManageRoles;
