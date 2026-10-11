import { type PrintoutFile } from 'src/stock/printing/types/printout-file.type';

// Twenty refuses a 61st file in a FILES field, so a record keeps its newest 60 printouts.
export const PRINTOUTS_MAXIMUM = 60;

// A file saved again under a name the record already holds (a sign that was retried) replaces the
// earlier one, so the record never shows two copies of the same printout.
export const planPrintoutFiles = (existing: PrintoutFile[], added: PrintoutFile[], maximum = PRINTOUTS_MAXIMUM) => {
  const addedLabels = new Set(added.map((file) => file.label));

  return [...existing.filter((file) => !addedLabels.has(file.label)), ...added].slice(-maximum);
};
