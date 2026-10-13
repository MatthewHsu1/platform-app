// Texts of the convert buttons: refusals and the notes they write. Each is
// translated where it is shown or written.
export const CONVERT_MESSAGES = {
  alreadyOpportunity: 'This lead is already an opportunity.',
  notPending: 'Only a pending lead can be converted. Restore a lost lead first.',
  closed: 'A lead at 100 % is closed and cannot be converted.',
  chooseContact: 'Choose the contact to link.',
  selectTwo: 'Select at least two leads.',
  tooManyDuplicates: '{name} has more than {max} duplicates. Merge some of them first.',
  notesTitle: 'Notes from the lead {name}',
  emailTakenTitle: 'Contact created without email',
  emailTakenBody: 'Another contact already uses {email}, so the new contact was made without it.',
  websiteTakenTitle: 'Company created without website',
  websiteTakenBody: 'Another company already uses the website {website}, so the new company was made without it.',
} as const;
