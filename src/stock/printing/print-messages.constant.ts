// The print route refuses with these texts, translated through the catalog; the print page itself is English.
export const PRINT_MESSAGES = {
  chooseReport: 'Choose what to print.',
  nothingToPrint: 'Nothing to print.',
  optionsNotValid: 'These print options are not valid.',
  timeZoneNotValid: 'Your time zone is not known. Check the time zone in your settings and print again.',
} as const;

export const PRINT_PAGE_MESSAGES = {
  linkNotValid: 'This print link is not valid any more. Print again from Twenty.',
  failed: 'Could not print.',
} as const;
