// Notes the sales team rules leave; translated in the saver's language.
export const TEAM_MESSAGES = {
  defaultTeam: 'This is a default sales team. It cannot be deleted; it can stay archived.',
  usedByStage: 'Some pipeline stages are limited to this sales team. Take the team off those stages first.',
  duplicateMember: '{name} is already an active member of this team. The new or changed membership was undone.',
  filterUnusable: 'The assignment filter could not be used, so the previous filter is back. {reason}',
  filterUnusableCreate: 'A new sales team or team member was removed because its assignment filter could not be used. {reason}',
} as const;
