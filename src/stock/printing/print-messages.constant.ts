// The print route refuses with these texts, translated through the catalog; the print page itself is English.
export const PRINT_MESSAGES = {
  chooseReport: 'Choose what to print.',
  nothingToPrint: 'Nothing to print.',
  optionsNotValid: 'These print options are not valid.',
  timeZoneNotValid: 'Your time zone is not known. Check the time zone in your settings and print again.',
  oneRecordOnly: 'Choose one record to print this report.',
  tooManyLines: 'Up to {max} unfolded or chosen lines can be printed at once. Fold or untick some and print again.',
} as const;

export const PRINT_PAGE_MESSAGES = {
  linkNotValid: 'This print link is not valid any more. Print again from Twenty.',
  failed: 'Could not print.',
} as const;

// Printed under a signed slip's lines, in the page's language like the rest of the slip.
export const SIGNATURE_PAGE_TEXTS = {
  heading: 'Signature',
  failed: 'The signature could not be loaded.',
} as const;
