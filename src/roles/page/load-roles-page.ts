import { RolesUserError } from 'src/roles/page/roles-route';
import { ROLES_MESSAGES } from 'src/roles/roles-messages.constant';
import { type CallerAccess } from 'src/roles/types/caller-access.type';
import { type RolesPage } from 'src/roles/types/roles-page.type';
import { mayManageRoles } from 'src/roles/utils/may-manage-roles.util';

// Reads with the app token, so it checks first that the clicking user may manage roles; a request
// with nobody signed in behind it (an API key) may not.
export const makeLoadRolesPage =
  (deps: { readAccess: () => Promise<CallerAccess | null>; readPage: (access: CallerAccess) => Promise<RolesPage> }) =>
  async (): Promise<RolesPage> => {
    const access = await deps.readAccess();

    if (access === null || !mayManageRoles(access)) {
      throw new RolesUserError(403, ROLES_MESSAGES.notAdmin);
    }
    const { rows, modules } = await deps.readPage(access);

    return { rows, modules };
  };
