import { type RolesPage } from 'src/roles/types/roles-page.type';

// The page as the routes read it: the default role's label is for the sentence after a save.
export type RolesPageWithDefaultRole = RolesPage & { defaultRoleLabel: string };
