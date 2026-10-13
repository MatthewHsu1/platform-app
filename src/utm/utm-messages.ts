// Notes and errors of the campaign, source, medium and stage rules; translated in the saver's language.
export const UTM_MESSAGES = {
  referralSource: 'This source cannot be deleted: referrals use it.',
  protectedMedium: 'This medium cannot be deleted: other parts of the system rely on it.',
  stageInUse: 'Some campaigns are in this stage. Move them to another stage first.',
  nameTaken: 'The name "{name}" is already used. The change was undone.',
  requiredEmptied: 'A campaign needs a name, a responsible and a stage. The change was undone.',
  archivedName: 'The save was undone and its new records removed: an archived record already has the name "{name}".',
} as const;
