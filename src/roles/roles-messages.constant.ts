import { ROLE_SYNC_BUSY_MESSAGE } from 'src/roles/constants/role-sync-busy-message.constant';

// Texts the routes answer with; the front component lists them for translation.
export const ROLES_MESSAGES = {
  notAdmin: 'Only an admin can change roles.',
  ownRow: 'You cannot change your own role. Another admin must do it.',
  adminRow: "This person is an Admin. Change an Admin's role in Settings → Members.",
  unknownMember: 'This person is not a member of the workspace any more.',
  badRequest: 'Choose a person and their levels.',
  busy: ROLE_SYNC_BUSY_MESSAGE,
  saved: 'Saved. {name} now holds {role}.',
} as const;
