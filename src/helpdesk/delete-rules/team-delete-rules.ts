import { type DeleteRules } from 'src/helpdesk/delete-rules/types/delete-rules.type';

// Other modules add their own rows at load time; the trigger applies them all.
export const TEAM_DELETE_RULES: DeleteRules = { references: [], cascades: [], links: [] };
