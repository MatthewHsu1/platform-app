// The print route refuses with these texts in the user's language; the print page itself is English.
export const PRINT_MESSAGES = {
  chooseReport: 'Choose what to print.',
  nothingToPrint: 'Nothing to print.',
} as const;

export const PRINT_PAGE_MESSAGES = {
  linkNotValid: 'This print link is not valid any more. Print again from Twenty.',
  failed: 'Could not print.',
} as const;
