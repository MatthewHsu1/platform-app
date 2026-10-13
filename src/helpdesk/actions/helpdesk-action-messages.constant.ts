// The English source of the answers of the work case buttons. Routes translate them into the clicking user's
// language; the texts are listed for the translation extractor in the front component of each button.
export const HELPDESK_ACTION_MESSAGES = {
  selectOneCase: 'Select one work case.',
  selectSomeCases: 'Select at least one work case.',
  caseNotFound: 'Work case not found.',
  noCasesReadable: 'None of the selected work cases could be read.',
  alreadyYours: 'This case is already assigned to you.',
  notInTeam: "You are not a member of this case's team.",
  duplicateRefusal: 'Choose a valid original case.',
  trackingOff: 'Duplicate tracking is turned off in the work case settings.',
  needsSalesRights: 'You need sales rights to create an opportunity.',
  opportunityNoteTitle: 'Opportunity created',
  opportunityNoteBody: 'This case became opportunity {name}',
} as const;
